import json
from cairo import Status
from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect
from django.http import response
from django.http.response import JsonResponse
from django.shortcuts import redirect, render
from django.urls import reverse
from django.urls.conf import path
from django.views.decorators.csrf import csrf_exempt, csrf_protect
from django.contrib.auth.decorators import login_required
from django.core.files.storage import FileSystemStorage
from django.core.paginator import Paginator
from requests.api import options

from .models import *

def index(request):
  if request.user.is_authenticated:
    return render(request, "network/index.html")
  else:
    return HttpResponseRedirect(reverse("login"))


def login_view(request):
  if request.method == "POST":
    # Attempt to sign user in
    username = request.POST["username"]
    password = request.POST["password"]
    user = authenticate(request, username=username, password=password)

    # Check if authentication successful
    if user is not None:
      login(request, user)
      return HttpResponseRedirect(reverse("index"))
    else:
      return render(request, "network/login.html", {
        "message": "Invalid email and/or password.",
        "login": True
      })
  else:
    return render(request, "network/login.html", {
      "login": True
    })


def logout_view(request):
  logout(request)
  return HttpResponseRedirect(reverse("login"))


def register(request):
  if request.method == "POST":
    first_name = request.POST["first-name"]
    last_name = request.POST["last-name"]
    username = request.POST["username"]
    email = request.POST["email"]

    # Ensure password matches confirmation
    password = request.POST["password"]
    confirmation = request.POST["confirmation"]
    if password != confirmation:
      return render(request, "network/login.html", {
        "alert": "Passwords must match.",
        "register": True
      })

    # Attempt to create new user
    try:
      user = User.objects.create_user(first_name=first_name, last_name=last_name, username=username, email=email, password=password)
      user.save()
    except IntegrityError:
      return render(request, "network/login.html", {
          "alert": "Username already taken.",
          "register": True
      })
    login(request, user)
    return HttpResponseRedirect(reverse("index"))
  else:
    return render(request, "network/login.html", {
      "register": True
    })


@login_required
@csrf_protect
def compose(request):
  data = json.loads(request.body)
  user = request.user
  
  body = data.get("body", "")
  image = data.get("image", "")
  preview = data.get("link", "")
  post_id = data.get("post_id", "")
  model = data.get("model", "")

  # Composing a new post must be via POST
  if request.method == "POST":
    if model == "Post":
      tweet = Retweet(
        user=user,
        body=body,
        post=Post.objects.get(id=post_id)
      )
    elif model == "Retweet":
      tweet = Retweet(
        user=user,
        body=body,
        rt=Retweet.objects.get(id=post_id)
      )
    else:
      tweet = Post(
        user=request.user,
        body=body,
        image=image,
        link=preview
      )
    tweet.save()
    return JsonResponse(tweet.serialize(user), safe=False, status=201)
  # Edit tweet
  elif request.method == "PUT":
    if model == "Retweet":
      try:
        rt = Retweet.objects.get(id=post_id)
      except:
        return JsonResponse({"error": "Retweet not found."}, status=400)
      rt.body=body
      rt.save()
    else:
      try:
        post = Post.objects.get(id=post_id)
      except Post.DoesNotExist:
        return JsonResponse({"error": "Post not found."}, status=404)
      post.body=body
      post.image=image
      post.link=preview
      post.save()
    return HttpResponse(status=201)
  else:
    return JsonResponse({"error": "POST or PUT request required."}, status=400)


@login_required
def postbox(request, postbox, pg):
  tweets = []
  # Only posts from following users
  if postbox == "home":
    tweets = Post.get_all_posts_and_retweets(True, request.user)
  # Show all posts
  elif postbox == "explore":
    tweets = Post.get_all_posts_and_retweets()
  # Show current user's posts
  elif postbox == "profile":
    tweets = Post.get_all_posts_and_retweets(request.user)
  paginator = Paginator(tweets, 10)
  g_page = paginator.get_page(pg)

  return JsonResponse({
    "posts": [tweet.serialize(request.user) for tweet in g_page.object_list],
    "num_pages": paginator.num_pages,
    "current_page": pg,
    "previous": paginator.page(pg).has_previous(),
    "next": paginator.page(pg).has_next(),
    }, safe=False)


@login_required
def get_post(request, model, post_id):
  user = request.user
  # Get posts
  if request.method == "GET":
    if model == "Retweet":
      try:
        status = Retweet.objects.get(id=post_id)
      except Retweet.DoesNotExist:
        return JsonResponse({"error": "Retweet not found."}, status=404)
    else:
      try:
        status = Post.objects.get(id=post_id)
      except Post.DoesNotExist:
        return JsonResponse({"error": "Post not found."}, status=404)
    return JsonResponse(status.serialize(request.user))
  # Update wheter post is liked or not
  elif request.method == "PUT":

    if model == "Retweet":
      post = Retweet.objects.get(id=post_id)
      if user in post.like.all():
        user.retweets_liked.remove(post)
      else:
        user.retweets_liked.add(post)
    elif model == "Comment":
      post = Comment.objects.get(id=post_id)
      if user in post.like.all():
        user.comments_liked.remove(post)
      else:
        user.comments_liked.add(post)
    elif model == "Post":
      post = Post.objects.get(id=post_id)
      if user in post.like.all():
        user.posts_liked.remove(post)
      else:
        user.posts_liked.add(post)
    else:
      return HttpResponse({"Not Found!"}, status=404)
    return HttpResponse({"status: 204"}, status=204)
  # Make a new comment
  elif request.method == "POST":
    body = json.loads(request.body).get("body", "")

    if model == "Retweet":
      comment = Comment(
        user=user,
        body=body,
        retweet=Retweet.objects.get(id=post_id)
      )
    else:
      comment = Comment(
        user=user,
        body=body,
        post=Post.objects.get(id=post_id)
      )
    comment.save()
    return JsonResponse({"success": "Comment made successfuly."}, safe=False, status=201)


@login_required
def profile(request, username, table):
  try:
    user = User.objects.get(username=username)
  except User.DoesNotExist:
    return JsonResponse({"error": "User does not exist."}, status=404)
  # Get profile
  if request.method == "GET":
    # Comments made by the user
    if table == "replies":
      info = Comment.objects.filter(user=user)
    # Posts liked by the user
    elif table == "likes":
      info = user.posts_liked.all()
    # Posts and retweets made by the user
    else:
      info = Post.get_all_posts_and_retweets(current_user=user)
    return JsonResponse({
      "user": user.serialize(request.user),
      "table": [i.serialize() for i in info]
    })
  # Follow and Unfollow
  elif request.method == "PUT":
    if request.user in user.followers.all():
      user.followers.remove(request.user)
    else:
      user.followers.add(request.user)
    return HttpResponse(status=204)
  return JsonResponse({"error": "PUT or GET method required."}, status=400)


@login_required
@csrf_protect
def change_acc_pic(request):
  if request.method == "POST":
    user = request.user
    picture = request.FILES.get("picture", user.picture)
    
    if picture is not None and picture != user.picture:
      fss = FileSystemStorage()
      rename = rename_profile_pic(picture, picture.name)
      fss.save(rename, picture)
      user.picture=rename
      user.save()
    return HttpResponse(status=204)
  else:
    return HttpResponse({"error":"POST method required."}, status=400)


@login_required
@csrf_protect
def change_acc_info(request):
  if request.method == "PUT":
    user = request.user
    info = json.loads(request.body)

    user.first_name = info.get("first")
    user.last_name = info.get("last")
    user.biography = info.get("bio")

    if user.username != info.get("username"):
      try:
        user.username = info.get("username")
      except:
        return JsonResponse({"error": "Username already taken."})

    user.save()
    return JsonResponse({"success": "Profile edited successfully."}, status=201)
  else:
    return JsonResponse({"error": "PUT method required."}, status=400)


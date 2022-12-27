from operator import truediv
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.fields import TextField
from django.utils import tree
from linkpreview import link_preview
from uuid import uuid4
from itertools import chain


def rename_profile_pic(instance, filename):
  
  ext = filename.split('.')[-1]
  # set a random name for the file
  filename = '{}.{}'.format(uuid4().hex, ext)

  return filename


class User(AbstractUser):
  picture = models.ImageField(default="default.png", upload_to=rename_profile_pic)
  biography = models.TextField(max_length=379, blank=True)
  following = models.ManyToManyField("User", related_name="followers", blank=True)

  def serialize(self, current_user=None):
    return {
      "name": self.first_name.capitalize() + " " + self.last_name.capitalize(),
      "username": self.username,
      "profile_pic": self.picture.url,
      "biography": self.biography,
      "followers": self.followers.count(),
      "following": self.following.count(),
      "is_following": current_user in self.followers.all(),
      "show_follow_btn": self.username != current_user.username
    }


class Post(models.Model):
  user = models.ForeignKey("User", on_delete=models.CASCADE, related_name="posts")
  body = models.TextField(max_length=379)
  image = models.CharField(blank=True, max_length=200)
  link = models.CharField(blank=True, max_length=300)
  timestamp = models.DateTimeField(auto_now=True)
  like = models.ManyToManyField("User", related_name="posts_liked", blank=True)
  
  class Meta:
    ordering = ["-timestamp"]

  def __str__(self):
    return f"Post with id {self.id}"

  def linkpreview(self):
    # Set a default picture for link preview
    if self.link:
      p = link_preview(self.link)
      try:
        p
      except:
        return ""
      else:
        try:
          p.image
        except:
          p.image = "https://raw.githubusercontent.com/sammanthaps/Images/main/harvardnopic.png"  
        return {
          "title": p.title,
          "description": p.description,
          "image": p.image
        }
  
  def get_all_posts_and_retweets(following=False, current_user=None):
    # My Posts
    if current_user and not following:
      posts = Post.objects.filter(user=current_user)
      rts = Retweet.objects.filter(user=current_user)
    # Home: Following user's posts
    elif current_user and following:
      posts = Post.objects.filter(user__in=current_user.following.all())
      rts = Retweet.objects.filter(user__in=current_user.following.all())
    # Explore: All posts
    else:
      posts = Post.objects.all()
      rts = Retweet.objects.all()
    list = sorted(chain(posts, rts), key=lambda x: x.timestamp, reverse=True)
    return list
  
  def serialize(self, current_user=None):
    return {
      "id": self.id,
      "name": self.user.first_name.capitalize() + " " + self.user.last_name.capitalize(),
      "username": self.user.username,
      "profile_pic": self.user.picture.url,
      "content": self.body,
      "image": self.image,
      "link": self.link,
      "preview": self.linkpreview(),
      "likes": self.like.count(),
      "retweets": Retweet.objects.filter(post=self.id).count(),
      "comments": Comment.objects.filter(post=self.id).count(),
      "liked": current_user in self.like.all(),
      "retweeted": current_user in Retweet.objects.filter(post=self.id),
      "edit": current_user == self.user,
      "showComments":[comment.serialize(current_user) for comment in Comment.objects.filter(post=self.id)],
      "timestamp": self.timestamp.strftime("%b %d %Y, %I:%M %p"),
      "model": "Post"
    }


class Retweet(models.Model):
  user = models.ForeignKey("User", on_delete=models.CASCADE)
  post = models.ForeignKey("Post", on_delete=models.CASCADE, blank=True, null=True)
  rt = models.ForeignKey("self", on_delete=models.CASCADE, related_name="retweeted", blank=True, null=True)
  like = models.ManyToManyField("User", related_name="retweets_liked", blank=True)
  body = models.TextField(max_length=379, blank=True)
  timestamp = models.DateTimeField(auto_now=True)

  class Meta:
    ordering = ["-timestamp"]

  def __str__(self):
    return f"Post with id {self.id}"
  
  def serialize(self, current_user=None):
    return {
      "id": self.id,
      "name": self.user.first_name.capitalize() + " " + self.user.last_name.capitalize(),
      "username": self.user.username,
      "profile_pic": self.user.picture.url,
      "content": self.body,
      "retweet": self.post.serialize() if self.post else self.rt.serialize(),
      "likes": self.like.count(),
      "retweets": Retweet.objects.filter(post=self.id).count(),
      "comments": Comment.objects.filter(retweet=self.id).count(),
      "liked": current_user in self.like.all(),
      "showComments": [comment.serialize(current_user) for comment in Comment.objects.filter(retweet=self.id)],
      "timestamp": self.timestamp.strftime("%b %d %Y, %I:%M %p"),
      "edit": current_user == self.user,
      "model": "Retweet",
    }


class Comment(models.Model):
  user = models.ForeignKey("User", on_delete=models.CASCADE)
  post = models.ForeignKey("Post", on_delete=models.CASCADE, blank=True, null=True)
  retweet = models.ForeignKey("Retweet", on_delete=models.CASCADE, blank=True, null=True)
  body = models.TextField(max_length=379)
  timestamp = models.DateTimeField(auto_now=True)
  like = models.ManyToManyField("User", related_name="comments_liked", blank=True)

  def __str__(self):
    return f"{self.user} commented the post with id {self.post_id}"

  def serialize(self, current_user=None):
    return {
      "id": self.id,
      "name": self.user.first_name.capitalize() + " " + self.user.last_name.capitalize(),
      "username": self.user.username,
      "profile_pic": self.user.picture.url,
      "content": self.body,
      "likes": self.like.count(),
      "liked": current_user in self.like.all(),
      "timestamp": self.timestamp.strftime("%b %d %Y, %I:%M %p"),
      "model": "Retweet" if self.retweet else "Post",
      "post_user": self.post.user.username if self.post else self.retweet.user.username,
      "post_id": self.post_id if self.post else self.retweet_id
    }


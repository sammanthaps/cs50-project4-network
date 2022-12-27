
from os import name
from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    
    # API Routes
    # Posts
    path("posts", views.compose, name="compose"),
    path("posts/<str:model>/<int:post_id>", views.get_post, name="get_post"),
    path("<str:postbox>/<int:pg>", views.postbox, name="postbox"),
    # Profile
    path("profile/<str:username>/<str:table>", views.profile, name="profile"),
    # Settings
    path("profile/edit-pic", views.change_acc_pic, name="edit_profile_pic"),
    path("profile/edit-info", views.change_acc_info, name="edit_profile"),
    path("profile/change-pass", views.change_acc_info, name="edit_profile"),
]

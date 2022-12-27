from django.contrib import admin

from .models import *

# Register your models here.
@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'username', 'first_name')
    list_per_page = 10

@admin.register(Post, Retweet)
class PostsAdmin(admin.ModelAdmin):
    list_display = ('user', 'body', 'id', 'timestamp')
    list_per_page = 10

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('user', 'id', 'post_id', 'retweet_id')
    list_per_page = 10


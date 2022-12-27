// CSRF Token
function getCookie(name) {
  var cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var cookie = jQuery.trim(cookies[i]);
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Variables to use in fetch
const cred = 'include';
const hdr = {
  'Content-Type': 'application/json, multipart/form-data',
  'Access-Control-Allow-Credentials': true,
  'X-CSRFToken': getCookie('csrftoken')
};

document.addEventListener('DOMContentLoaded', function() {

  document.querySelector('#home').addEventListener('click', () => load_postbox('home'));
  document.querySelector('#explore').addEventListener('click', () => load_postbox('explore'));
  document.querySelector('#config').addEventListener('click', () => {
    document.querySelector('#settings').style.display = 'block';
    document.querySelector('#profile').style.display = 'none';
    document.querySelector('#posts').style.display = 'none';
    document.querySelector('#show-user-info').style.display = 'none';
    document.querySelector('#change-password').style.display = 'none';
    document.querySelector('#page-control-btn').style.display = 'none';
  })
  // By default show all posts
  load_postbox('explore');
})

// Show compose form
document.querySelector('#tweet-compose').addEventListener('click', function() {
  document.querySelector('#compose-form').reset();
  document.querySelector('#new-tweet').style.display = 'block';
  document.querySelector('#compose-body').focus();
  document.querySelector('#compose-form').addEventListener('submit', (e) => {
    e.preventDefault();
    send_post();
  });

  // Close compose form
  document.querySelector('#compose-close-btn').addEventListener('click', function() {
    document.querySelector('#new-tweet').style.display = 'none';
  })
});

// Preview profile image before it's uploaded
document.querySelector('#pic-file').addEventListener('change', () => {
  const [file] = document.querySelector('#pic-file').files;

  if(file) {
    document.querySelector('#profile-pic-file').src = URL.createObjectURL(file);
    document.querySelector('#save-pic').style.display = 'inline';
  }
})

function load_postbox(postbox, pg=1) {

  // Show postbox and hide other views
  document.querySelector('#posts').style.display = 'block';
  document.querySelector('#show-user-info').style.display = 'block';
  document.querySelector('#profile').style.display = 'none';
  document.querySelector('#settings').style.display = 'none';

  // Show postbox title
  document.querySelector('#center-title').innerHTML = `${postbox.charAt(0).toUpperCase() + postbox.slice(1)}`;
  
  // Clear postbox
  document.querySelector('#posts').innerHTML = '';
  
  fetch(`${postbox}/${pg}`)
  .then(response => response.json())
  .then(posts => {
    posts['posts'].forEach(post => { build_post(post); });
    page_control(postbox, pg, posts['num_pages'], posts['previous'], posts['next']);
  })
}

function page_control(postbox, current_page, num_pages, previous, next) {
  const pages = document.querySelector('#page-num');
  const prev = document.querySelector('#previous');
  const nxt = document.querySelector('#next');
  pages.innerHTML = '';

  // Pagination
  for(let p = 1; p <= num_pages; p++) {
    const page_num = document.createElement('span');
    page_num.innerHTML = p;
    page_num.addEventListener('click', () => {
      load_postbox(postbox, p);
    });

    // Style page buttons
    if (p == current_page) {
      page_num.className += "selected";
    } else {
      page_num.className = `page ${p}`
    }
    pages.append(page_num);
  }

  // Disable/enable previous/next btns
  let counter = current_page;
  if(!previous) {
    prev.disabled = true;
  } else {
    prev.disabled = false;
    prev.addEventListener('click', function() {
      counter--;
      load_postbox(postbox, counter);
    });  
  } if(!next) {
    nxt.disabled = true;
  } else {
    nxt.disabled = false;
    nxt.addEventListener('click', function() {
      counter++;
      load_postbox(postbox, counter);
    });
  }

  if (!previous && !next) {
    document.querySelector('#page-control-btn').style.display = 'none';
  } else {
    document.querySelector('#page-control-btn').style.display = 'block';
  }
}

function send_post(flag=true, tweet='') {

  let body, img, link, post_id, post_model;

  // If composing a new post
  if (flag) {
    body = document.querySelector('#compose-body').value;
    img = document.querySelector('#compose-img').value;
    link = document.querySelector('#compose-link').value;
    option = "";
    post_id = "";
    post_model = "";
  } else {
    // If retweeting a post
    body = document.querySelector('#rt-body').value;
    img = '';
    link = '';
    post_id = tweet['id'];
    post_model = tweet['model'];
  }

  fetch('/posts', {
    method: 'POST',
    credentials: cred,
    headers: hdr,
    body: JSON.stringify({
      body: body,
      image: img,
      link: link,
      model: post_model,
      post_id: post_id
    }),
  })
  .then(response => response.json())
  .then(result => {
    if(result['error']) {
      console.log(result['error']);
    } else {
      show_post(result['model'], result['id']);
    }
  });
  
  // Submit without reload
  return false;
}

function build_post(tweet, get_post=false) {

  const post = document.createElement('div');

  const post_info = document.createElement('div');
  post_info.className = 'post-info';
  post_info.innerHTML = 
  `
  <div class="post-user">
    <div class="post-user-pic"><img src="${tweet['profile_pic']}"></div>
    <div class="post-user-body">
      <div class="post-user-info">
        <div class="post-user-info-name" data-username="${tweet['username']}" onclick="build_profile(dataset.username)">
          <div class="post-user-fname fname">${tweet['name']}</div>
          <div class="post-user-name"><i class="bi bi-dot"></i> &#64;${tweet['username']}</div>
        </div>
        <div class="post-user-timestamp">${tweet['timestamp']}</div>
      </div>
      <div class="post-user-content">${tweet['content']}</div>
    </div>
  </div>
  `;

  // Show profile on click
  document.querySelectorAll('.post-user-info-name').forEach(user => {
    user.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  });
  
  const post_attachment = document.createElement('div');
  post_attachment.className = 'post-attachment';

  const preview = document.createElement('div');
  preview.className = 'gallery tweet-preview';

  const img = document.createElement('div');
  img.className = 'gallery tweet-img';

  const slide_btn = document.createElement('div');
  slide_btn.className = 'slide-btn';

  const dot1 = document.createElement('span');
  dot1.className = 'dot active';
  const dot2 = document.createElement('span');
  dot2.className = 'dot';

  const retweet = document.createElement('div');
  retweet.className = 'retweeted_tweet';
  
  const options = document.createElement('div');
  options.className = 'post-options';
  options.innerHTML = `<span class="post-reply" title="Reply"><i class="bi bi-chat-dots"></i> ${tweet['comments']}</span>`;

  const check_liked = tweet['liked'] ? `<i class="bi bi-suit-heart-fill liked"></i>` : `<i class="bi bi-suit-heart"></i>`;
  const like = document.createElement('span');
  like.className = 'post-like';
  like.title = `${tweet['liked']} ? "Dislike" : "Like"`;
  like.innerHTML = `${check_liked} ${tweet['likes']}`;
  like.addEventListener('click', () => {
    like_post(tweet['model'], tweet['id']);

    // Update btn state
    if(tweet['liked']) {
      like.innerHTML = `<i class="bi bi-suit-heart"></i> ${tweet["likes"] - 1}`;
      like.title = "Like";
      tweet['liked'] = false;
      tweet['likes']--
    } else {
      like.innerHTML = `<i class="bi bi-suit-heart-fill liked"></i> ${tweet["likes"] + 1}`;
      like.title = "Dislike";
      tweet['liked'] = true;
      tweet['likes']++
    }
  })

  const rt = document.createElement('span');
  rt.className = 'post-retweet';
  rt.title = 'Retweet';
  rt.innerHTML = `<i class="bi bi-arrow-repeat"></i> ${tweet['retweets']}`;
  rt.addEventListener('click', () => {
    document.querySelector('#new-retweet').style.display = 'block';
    document.querySelector('#retweet-form').reset();

    document.querySelector('#rt-body').focus();

    // Clean and close form
    document.querySelector('#rt-close-btn').addEventListener('click', () => {
      document.querySelector('#new-retweet').style.display = 'none';
    });
    
    // Show a preview of the post that will be retweeted
    document.querySelector('#rt-preview').innerHTML = 
    `
    <div id="rt-pic"><img src="${tweet['profile_pic']}"></div>
    <div id="rt-info">
      <div id="rt-user">
        <span id="rt-name">${tweet['name']}</span>
        <span id="rt-username"><i class="bi bi-dot"></i>&#64;${tweet['username']}</span>
        <span id="rt-timestamp">${tweet['timestamp']}</span>
      </div>
      <div id="rt-content">${tweet['content']}</div>
    </div>
    `

    // Submit form
    document.querySelector('#retweet-form').addEventListener('submit', (e) => {
      e.preventDefault();
      send_post(false, tweet);
    });
  });

  const edit = document.createElement('span');
  edit.className = 'edit-post';
  edit.title = 'Edit';
  edit.innerHTML = `<i class="bi bi-pencil-square"></i>`;
  edit.addEventListener('click', () => {
    // Show form
    document.querySelector('#edit-tweet').style.display = 'block';
    document.querySelector('#edit-body').value = tweet['content'];
    show_post(tweet['model'], tweet['id']);

    if(tweet['model'] == "Post") {
      document.querySelector('#edit-img').value = tweet['image'];
      document.querySelector('#edit-link').value = tweet['link'];
    } else {
      document.querySelector('#edit-options').style.display = 'none';
    }

    // Clean and close form
    document.querySelector('#edit-close-btn').addEventListener('click', () => {
      document.querySelector('#edit-form').reset();
      document.querySelector('#edit-tweet').style.display = 'none';
    })

    // Submit form
    document.querySelector('#edit-form').addEventListener('submit', (e) => {
      e.preventDefault();
      edit_post(tweet);
    });

  });

  const comment_form = document.createElement('div');
  comment_form.id = 'make-comment';
  comment_form.innerHTML =
  `
  <form id="comment-form">
    <div class="comment-form-options">
      <textarea id="comment-body" name="body" maxlength="379" placeholder="Write a comment..."></textarea>
    </div>
    <div id="comment-submit" class="comment-form-options">
      <input id="comment-submit-btn" type="submit" name="submit" value="Comment">
    </div>
  </form>
  `;

  const show_comments = document.createElement('div');
  show_comments.id = 'show-comments';

  if(tweet['preview']) {
    preview.innerHTML =
    `
    <div class="preview-img"><img src="${tweet['preview']['image']}"></div>
    <div class="preview-caption">
      <div class="caption-title">${tweet['preview']['title']}</div>
      <div class="caption-body">
        <p>${tweet['preview']['description']}</p>
      </div>
      <div class="caption-link">
        <i class="bi bi-link-45deg"></i>${tweet['link']}
      </div>
    </div>
    `
    preview.addEventListener('click', (e) => {
      e.stopPropagation()
      window.open(tweet["link"]);
    })
    post_attachment.append(preview);
  } if (tweet['image']) {
    img.innerHTML = 
    `
    <div class="img-link">
      <a href="${tweet['image']}" target="_blank">
        <img src="${tweet['image']}">
      </a>
    </div>
    `
    post_attachment.append(img);
  } if (tweet['preview'] && tweet['image']) {

    dot1.addEventListener("click", function(e) {
      e.stopPropagation();
      preview.style.display = "flex";
      img.style.display = "none";
      dot1.className += " active";
      dot2.className = dot2.className.replace(" active", "");
    });
    dot2.addEventListener("click", function(e) {
      e.stopPropagation();
      preview.style.display = "none";
      img.style.display = "flex";
      dot2.className += " active";
      dot1.className = dot1.className.replace(" active", "");
    });
    slide_btn.append(dot1, dot2);
    post_attachment.append(slide_btn);
    img.style.display = "none";

  } if(tweet['retweet']) {
    retweet.innerHTML = 
    `
    <div class="check-retweet">
      <span><i class="bi bi-arrow-repeat"></i>${tweet['name']} Retweeted</span>
    </div>

    <div class="retweet">
      <div class="retweet-pic">
        <img src="${tweet['retweet']['profile_pic']}">
      </div>

      <div class="retweet-body">
        <div class="retweet-user">
          <span class="retweet-fname fname" data-username="${tweet['retweet']['username']}" onclick="build_profile(this.dataset.username)">${tweet['retweet']['name']}</span>
          <span class="retweet-name"><i class="bi bi-dot"></i> &#64;${tweet['retweet']['username']}</span>
          <span class="retweet-timestamp">${tweet['retweet']['timestamp']}</span>
        </div>
        <div class="retweet-content">${tweet['retweet']['content']}</div>
      </div>
    </div>
    `;

    retweet.addEventListener('click', (e) => {
      e.stopPropagation();
      show_post(tweet['retweet']['model'], tweet['retweet']['id']);
    })
    post_info.append(retweet);
  }

  options.append(like, rt);
  if (tweet['edit']) { options.append(edit); }
  post_info.append(post_attachment);
  post.append(post_info, options);

  const index = document.querySelector('#posts');
    
  if (!get_post) {
    post.className = 'post';
    index.append(post);
    post_info.addEventListener('click', (e) => {
      e.stopPropagation();
      show_post(tweet['model'], tweet['id']);
    })
  } else {
    // Show comments
    for(let i=0; i<tweet['showComments'].length; i++) {

      const check_like = tweet['showComments'][i]['liked'] ? `<i class="bi bi-suit-heart-fill liked"></i>` : `<i class="bi bi-suit-heart"></i>`;
      const titleLiked = tweet['showComments'][i]['liked'] ? "Dislike" : "Like";
      
      const comment = document.createElement('div');
      comment.className = `comment ${[i]}`;
      comment.innerHTML =
      `
      <div class="comment-pic">
        <img src="${tweet['showComments'][i]['profile_pic']}">
      </div>
  
      <div class="comment-info">
        <div class="comment-user" onclick="build_profile('${tweet['showComments'][i]['username']}')">
          <span class="comment-fname">${tweet['showComments'][i]['name']}</span>
          <i class="bi bi-dot"></i><span class="comment-username">&#64;${tweet['showComments'][i]['username']}</span>
          <span class="comment-timestamp">${tweet['showComments'][i]['timestamp']}</span>
        </div>
  
        <div class="comment-body">${tweet['showComments'][i]['content']}</div>
      </div>
      `

      const like = document.createElement('div');
      like.className = 'comment-like';
      like.innerHTML = 
      `
      <span>${check_like}</span>
      <span>${tweet['showComments'][i]['likes']}</span>
      `;
      
      const t_id = tweet['showComments'][i]['id'];
      let t_liked = tweet['showComments'][i]['liked'];
      let t_likes = tweet['showComments'][i]['likes'];
      
      // Comment like
      like.addEventListener('click', () => {
        like_post("Comment", t_id);

        // Update btn state
        if(t_liked) {
          like.innerHTML = `<span><i class="bi bi-suit-heart"></i></span><span>${t_likes - 1}</span>`;
          like.title = "Like";
          t_liked = false;
          t_likes--
        } else {
          like.innerHTML = `<span><i class="bi bi-suit-heart-fill liked"></i></span><span>${t_likes + 1}</span>`;
          like.title = "Dislike";
          t_liked = true;
          t_likes++
        }    
      })

      comment.append(like);
      show_comments.append(comment);
    }

    post.id = 'status';
    index.innerHTML = '';
    index.append(post, comment_form, show_comments);
    
    // Submit form
    document.querySelector('#comment-form').addEventListener('submit', (e) => {
      e.preventDefault();
      comment_post(tweet);
    });
  }
}

function show_post(model, post_id) {

  // Show post and hide other views
  document.querySelector('#new-tweet').style.display = 'none';
  document.querySelector('#new-retweet').style.display = 'none';
  document.querySelector('#profile').style.display = 'none';
  document.querySelector('#page-control-btn').style.display = 'none';
  document.querySelector('#show-user-info').style.display = 'block';
  document.querySelector('#posts').style.display = 'block';

  // Show postbox title
  document.querySelector('#center-title').innerHTML = 'Tweet';

  fetch(`posts/${model}/${post_id}`)
  .then(response => response.json())
  .then(result => {
    // Change html title dinamically
    document.title = `${result['name']} on Network: "${result['content'].substr(0, 25)}..."`;

    build_post(result, get_post=true)
  })
}

function comment_post(tweet) {
  
  fetch(`posts/${tweet['model']}/${tweet['id']}`, {
    method: "POST",
    credentials: cred,
    headers: hdr,
    body: JSON.stringify({
      body: document.querySelector('#comment-body').value,
      post_id: tweet['id'],
      model: tweet['model']
    }),
  })
  .then(response => response.json())
  .then(result => {
    if(result['error']) {
      console.log(result['error']);
    } else {
      show_post(tweet['model'], tweet['id']);
    }
  })
}

function like_post(model, tweet) {

   fetch(`posts/${model}/${tweet}`, {
    method: 'PUT',
    credentials: cred,
    headers: hdr,
  })
}

function edit_post(tweet) {
  let img;
  let preview;
  if(tweet['model'] == 'Post') {
    img = document.querySelector("#edit-img").value;
    preview = document.querySelector("#edit-link").value;
  } else {
    img = '';
    preview = '';
  }

  fetch('/posts', {
    method: 'PUT',
    credentials: cred,
    headers: hdr,
    body: JSON.stringify({
      body: document.querySelector("#edit-body").value,
      image: img,
      link: preview,
      post_id: tweet["id"],
      model: tweet['model']
    })
  })
  .then(result => {
    if(result['error']) {
      console.log(result['error']);
    } else {
      document.querySelector('#edit-tweet').style.display = 'none';
      show_post(tweet['model'], tweet['id']);
    }
  })
}

// Change account info
document.querySelector('#information').addEventListener('click', () => {
  document.querySelector('#information').style.borderColor = '#A41034';
  document.querySelector('#security').style.borderColor = '#a410351f';
  document.querySelector('#edit-profile').style.display = 'block';
  document.querySelector('#change-password').style.display = 'none';
});

// Change account pass
document.querySelector('#security').addEventListener('click', () => {
  document.querySelector('#security').style.borderColor = '#A41034';
  document.querySelector('#information').style.borderColor = '#a410351f';
  document.querySelector('#edit-profile').style.display = 'none';
  document.querySelector('#change-password').style.display = 'block';
});

// Profile info tables
document.querySelectorAll('.profile-btns').forEach(btn => {
  btn.addEventListener('click', () => build_profile(btn.dataset.username, btn.dataset.table));
});

function build_profile(username, table="tweets") {

  document.querySelector('#posts').style.display = 'none';
  document.querySelector('#show-user-info').style.display = 'none';
  document.querySelector('#settings').style.display = 'none';
  document.querySelector('#page-control-btn').style.display = 'none';
  document.querySelector('#profile').style.display = 'block';

  document.querySelectorAll('.profile-btns').forEach(btn => btn.dataset.username = username);
  
  fetch(`profile/${username}/${table}`)
  .then(response => response.json())
  .then(result => {

    document.querySelector('#profile-info-pic').innerHTML = `<img src="${result['user']['profile_pic']}">`;
    document.querySelector('#profile-info-user-name').innerHTML = `${result['user']['name']}`;
    document.querySelector('#profile-info-username').innerHTML = `&#64;${result['user']['username']}`;
    document.querySelector('#profile-info-biography').innerHTML = `${result['user']['biography']}`;
    document.querySelector('#following').innerHTML = `${result['user']['following']}`;
    document.querySelector('#followers').innerHTML = `${result['user']['followers']}`;

    // Change html title dinamically
    document.title = `${result['user']['name']} (@${result['user']['username']})`;

    const check = result['user']['is_following'] ? "Unfollow" : "Follow";
    const follow_span = document.querySelector('#span-follow');
    follow_span.innerHTML = `${check}`;
    if (result['user']['is_following']) {
      follow_span.style.background = '#a41034';
      follow_span.style.color = '#ffffff';
    }

    // Update follow btn status on click
    document.querySelector('#btn-follow').addEventListener('click', () => {
      const follow_btn = document.querySelector('#span-follow');

      if(result['user']['is_following']) {
        document.querySelector('#followers').innerHTML = `${result['user']['followers'] - 1}`;
        follow_btn.innerHTML = "Follow";
        follow_btn.style.background = '#ffffff';
        follow_btn.style.color = '#a41034';
        result['user']['is_following'] = false;
        result['user']['followers']--;
      } else {
        document.querySelector('#followers').innerHTML = `${result['user']['followers'] + 1}`;
        follow_btn.innerHTML = "Unfollow";
        follow_btn.style.background = '#a41034';
        follow_btn.style.color = '#ffffff';
        result['user']['is_following'] = true;
        result['user']['followers']++;
      }

      follow_profile(username);
    })
    
    // Hide follow btn for current user's profile
    if (!result['user']['show_follow_btn']) {
      document.querySelector('#btn-follow').style.display = 'none';
    }

    // Show users' tweets, replies and likes
    const profile_table = document.querySelector('#profile-posts');
    profile_table.innerHTML = '';
    result['table'].forEach(info => {
      const link = info['preview'] ? `<i class="bi bi-link"></i>` : "";
      const img = info['image'] ? `<i class="bi bi-card-image"></i>`: "";
      
      if (table == 'tweets') {
        document.querySelector('#profile-info-posts-tweets').focus();
        profile_table.innerHTML +=
        `
        <div class="post-info profile-post-info" data-model="${info['model']}" data-postid="${info['id']}" onclick="show_post(this.dataset.model, this.dataset.postid)">
          <div class="post-user">
            <div class="post-user-pic">
              <img class="profile-post-user-pic" src="${info['profile_pic']}">
            </div>
            <div class="post-user-body">
              <div class="post-user-info">
                <div class="post-user-info-name">
                  <div class="post-user-fname">${info['name']}</div>
                  <div class="post-user-name"><i class="bi bi-dot"></i> &#64;${info['username']}</div>
                </div>
                <div class="post-user-timestamp">${info['timestamp']}</div>
              </div>
              <div class="profile-post-content">${info['content']}</div>
            </div>
          </div>

          <div class="post-options">
            <span class="post-reply" title="Reply"><i class="bi bi-chat-dots"></i> ${info['comments']}</span>
            <span class="post-like" title="Like"><i class="bi bi-suit-heart"></i> ${info['likes']}</span>
            <span class="post-retweet" title="Retweet"><i class="bi bi-arrow-repeat"></i> ${info['retweets']}</span>
            <span title="Link for preview">${link}</span>
            <span title="Image attached">${img}</span>
          </div>
        </div>
        `
      } else if (table == 'replies') {
        profile_table.innerHTML +=
        `
        <div class="post-info profile-post-info" data-model="${info['model']}" data-postid="${info['post_id']}" onclick="show_post(this.dataset.model, this.dataset.postid)">
          <div class="post-user">
            <div class="post-user-pic">
              <img class="profile-post-user-pic" src="${info['profile_pic']}">
            </div>
            <div class="post-user-body">
              <div class="post-user-info">
                <div class="post-user-info-name">
                  <div class="post-user-fname">${info['name']}</div>
                  <div class="post-user-name"><i class="bi bi-dot"></i> &#64;${info['username']}</div>
                </div>
                <div class="post-user-timestamp">${info['timestamp']}</div>
              </div>
              <div class="profile-post-content">
                <div class="post-user-message">Replied to<span>&#64;${info['post_user']}</span></div>
                <div>${info['content']}</div>
              </div>
            </div>
          </div>
        `
      } else if (table == 'likes') {
        console.log(info)
        profile_table.innerHTML +=
        `
        <div class="post-info profile-post-info" data-model="${info['model']}" data-postid="${info['id']}" onclick="show_post(this.dataset.model, this.dataset.postid)">
          <div class="post-user">
            <div class="post-user-pic">
              <img class="profile-post-user-pic" src="${result['user']['profile_pic']}">
            </div>
            <div class="post-user-body">
              <div class="post-user-info">
                <div class="post-user-info-name">
                  <div class="post-user-fname">${result['user']['name']}</div>
                  <div class="post-user-name"><i class="bi bi-dot"></i> &#64;${result['user']['username']}</div>
                </div>
              </div>
              <div class="profile-post-content">
                <div class="post-user-message">Liked<span>&#64;${info['username']}</span>'s post</div>
                <div>${info['content']}</div>
              </div>
            </div>
          </div>
        `
      }
    })

  })
}

function follow_profile(username, table="tweets") {
  fetch(`profile/${username}/${table}`, {
    method: 'PUT',
    credentials: cred,
    headers: hdr,
  })
}

// Submit account form
document.querySelector('#change-acc-info').addEventListener('submit', (e) => {
  e.preventDefault();
  edit_profile();
})

function edit_profile() {
  fetch('profile/edit-info', {
    method: 'PUT',
    credentials: cred,
    headers: hdr,
    body: JSON.stringify({
      first: document.querySelector('#account-first-name').value,
      last: document.querySelector('#account-last-name').value,
      username: document.querySelector('#account-username').value,
      bio: document.querySelector('#account-bio').value,
    }),
  })
  .then(response => response.json())
  .then(result => {
    if (result['error']) {
      document.querySelector('#info-error').style.display = 'block';
    } else {
      document.querySelector('#info-success').style.display = 'block';
    }
  })

  return false;
}


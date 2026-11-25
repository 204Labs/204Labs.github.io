// Paper Run page: the gameplay trailer is a picture until it is played, then YouTube's player (its no-cookie address) takes its place.
document.addEventListener('click', function (event) {
  var link = event.target.closest ? event.target.closest('a.prg-yt[data-yt]') : null;
  if (!link) return;
  event.preventDefault();
  var frame = document.createElement('iframe');
  frame.className = 'prg-yt-frame';
  frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(link.dataset.yt) + '?autoplay=1&rel=0';
  frame.title = 'Paper Run gameplay trailer';
  frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  link.replaceWith(frame);
});

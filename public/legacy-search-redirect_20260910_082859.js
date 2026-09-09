// Fallback for static previews that do not apply Cloudflare's _redirects file.
const target = `/${window.location.search}`;
document.querySelector('#current-search-link').href = target;
window.location.replace(target);

import { InstagramObserver } from './observer';

// Only activate on Instagram
if (window.location.hostname === 'www.instagram.com') {
  const observer = new InstagramObserver();
  observer.start();
  console.log('[KnowMe] Content script active on Instagram');
}

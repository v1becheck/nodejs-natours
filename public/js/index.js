// index.js
/* eslint-disable */
// import '@babel/polyfill';
// import 'core-js/stable';
// import 'regenerator-runtime';
import { showAlert } from './alerts';
import { signup } from './signup';
import { login, logout } from './login';
import { updateSettings } from './updateSettings';
import { displayMap } from './leaflet';
import { bookTour } from './stripe';

const map = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const signupForm = document.querySelector('.form--signup');
const logoutBtn = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const bookBtn = document.getElementById('book-tour');

if (map) {
  try {
    const locations = JSON.parse(map.dataset.locations);
    displayMap(locations);
  } catch (e) {
    console.error('Error parsing locations:', e);
  }
}

if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.querySelector('.btn--signup').textContent = 'Signing up...';
    document.querySelector('.btn--signup').style.opacity = 0.6;
    document.querySelector('.btn--signup').style.cursor = 'auto';
    document.querySelector('.btn--signup').disabled = true;

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;
    await signup(name, email, password, passwordConfirm);

    document.querySelector('.btn--signup').textContent = 'Log In';
    document.querySelector('.btn--signup').style.opacity = 1;
    document.querySelector('.btn--signup').style.cursor = 'pointer';
    document.querySelector('.btn--signup').disabled = false;
  });
}

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.querySelector('.btn--login').textContent = 'Logging in...';
    document.querySelector('.btn--login').style.opacity = 0.6;
    document.querySelector('.btn--login').style.cursor = 'auto';
    document.querySelector('.btn--login').disabled = true;

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    await login(email, password);

    document.querySelector('.btn--login').textContent = 'Log In';
    document.querySelector('.btn--login').style.opacity = 1;
    document.querySelector('.btn--login').style.cursor = 'pointer';
    document.querySelector('.btn--login').disabled = false;
  });
}

if (userDataForm) {
  userDataForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);

    updateSettings(form, 'User');
  });
}

if (userPasswordForm) {
  userPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.querySelector('.btn--save-password').textContent = 'Updating...';
    document.querySelector('.btn--save-password').style.opacity = 0.6;
    document.querySelector('.btn--save-password').style.cursor = 'auto';
    document.querySelector('.btn--save-password').disabled = true;

    const currentPassword = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    await updateSettings(
      { currentPassword, password, passwordConfirm },
      'Password'
    );

    // Clear fields after password update
    document.querySelector('.btn--save-password').textContent = 'Save Password';
    document.querySelector('.btn--save-password').style.opacity = 1;
    document.querySelector('.btn--save-password').style.cursor = 'pointer';
    document.querySelector('.btn--save-password').disabled = false;
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });
}

if (logoutBtn) logoutBtn.addEventListener('click', logout);

if (bookBtn)
  bookBtn.addEventListener('click', (e) => {
    e.target.textContent = 'Processing...';
    const tourId = e.target.dataset.tourId;
    bookTour(tourId);
  });

const alertMessage = document.querySelector('body').dataset.alert;
if (alertMessage) showAlert('success', alertMessage, 20);

// Scroll to top functionality
const scrollToTopBtn = document.getElementById('scrollToTop');

if (scrollToTopBtn) {
  // Show/hide button based on scroll position
  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
      scrollToTopBtn.classList.add('show');
    } else {
      scrollToTopBtn.classList.remove('show');
    }
  });

  // Smooth scroll to top when clicked
  scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  });
}

// Loader functionality for overview page
const loader = document.getElementById('loader');
const currentPath = window.location.pathname;

// Show loader until all images are loaded on overview page (root path)
if (currentPath === '/' && loader) {
  const images = document.querySelectorAll('img');
  let imagesLoaded = 0;
  const totalImages = images.length;

  if (totalImages === 0) {
    setTimeout(() => {
      loader.classList.add('hidden');
    }, 300);
  } else {
    const checkAllImagesLoaded = () => {
      imagesLoaded++;
      if (imagesLoaded === totalImages) {
        loader.classList.add('hidden');
      }
    };

    images.forEach((img) => {
      if (img.complete && img.naturalHeight !== 0) {
        checkAllImagesLoaded();
      } else {
        img.addEventListener('load', checkAllImagesLoaded);
        img.addEventListener('error', checkAllImagesLoaded);
      }
    });

    // Fallback: hide loader after 2 seconds maximum
    setTimeout(() => {
      loader.classList.add('hidden');
    }, 2000);
  }
} else if (loader) {
  // Hide loader immediately for other pages
  loader.classList.add('hidden');
}

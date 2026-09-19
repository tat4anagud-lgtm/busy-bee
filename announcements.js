/**
 * Announcements Feed Interactive Script — Busy Bee Platform
 */

document.addEventListener('DOMContentLoaded', () => {
  const sidebarCategoryMenu = document.getElementById('sidebarCategoryMenu');
  const feedCards = document.querySelectorAll('.feed-card');

  // Category Filtering
  if (sidebarCategoryMenu) {
    sidebarCategoryMenu.addEventListener('click', (e) => {
      const btn = e.target.closest('.menu-item');
      if (!btn) return;

      // Toggle active style
      document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
      btn.classList.add('active');

      const selectedCategory = btn.getAttribute('data-category');

      feedCards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        if (selectedCategory === 'All' || cardCategory === selectedCategory) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }

  // Like Button Functionality
  document.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const isLiked = btn.classList.contains('active');
      const countSpan = btn.querySelector('.stat-count');
      let baseLikes = parseInt(btn.getAttribute('data-likes'), 10) || 0;

      if (!isLiked) {
        btn.classList.add('active');
        baseLikes += 1;
      } else {
        btn.classList.remove('active');
      }

      if (countSpan) {
        // Format large numbers (e.g. 1201 -> 1.2K)
        if (baseLikes >= 1000) {
          countSpan.textContent = (baseLikes / 1000).toFixed(1) + 'K';
        } else {
          countSpan.textContent = baseLikes;
        }
      }
    });
  });

  // Bookmark Button Toggle
  document.querySelectorAll('.bookmark-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
    });
  });

  // Poll Interaction
  const pollCard = document.querySelector('.poll-card');
  if (pollCard) {
    const voteBtn = pollCard.querySelector('.btn-secondary');
    const radios = pollCard.querySelectorAll('input[type="radio"]');

    if (voteBtn) {
      voteBtn.addEventListener('click', () => {
        const selected = Array.from(radios).find(r => r.checked);
        if (selected) {
          voteBtn.textContent = 'Голос принят!';
          voteBtn.style.backgroundColor = '#D4A359';
          voteBtn.style.color = '#FFFFFF';
          voteBtn.disabled = true;
        } else {
          alert('Пожалуйста, выберите вариант ответа.');
        }
      });
    }
  }
});
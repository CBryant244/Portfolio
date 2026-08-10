// Modal Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modal when clicking outside the container box
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

// Project Category Filtering
function filterProjects(category) {
    const cards = document.querySelectorAll('.project-card');
    const buttons = document.querySelectorAll('.filter-btn');

    // Update active button styling
    buttons.forEach(btn => {
        if (btn.getAttribute('onclick').includes(`'${category}'`)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Show/hide matching project cards
    cards.forEach(card => {
        const cardCategories = card.getAttribute('data-category');
        
        if (category === 'all' || (cardCategories && cardCategories.includes(category))) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });
}

console.log("script.js loaded successfully.");
// managePosts.js

// Global state
let currentEditingPost = null;

// Helpers
function getCurrentUser() {
  // Returns logged-in username or null
  return localStorage.getItem("loggedInUser");
}

// Init
window.addEventListener("DOMContentLoaded", () => {
  setupEditModal();
});

// Modal setup
function setupEditModal() {
  const modal = document.getElementById("editModal");
  const saveBtn = document.getElementById("editSaveBtn");
  const cancelBtn = document.getElementById("editCancelBtn");

  if (!modal || !saveBtn || !cancelBtn) return;

  cancelBtn.addEventListener("click", () => {
    modal.style.display = "none";
    currentEditingPost = null;
  });

  // Close when clicking outside the modal content
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
      currentEditingPost = null;
    }
  });

  saveBtn.addEventListener("click", handleEditSave);
}

// Open edit modal
function handleEdit(post) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert("Please log in to edit posts.");
    return;
  }

  currentEditingPost = post;

  const modal = document.getElementById("editModal");
  const skillInput = document.getElementById("editSkillInput");
  const categoryInput = document.getElementById("editCategoryInput");
  const descriptionInput = document.getElementById("editDescriptionInput");

  if (!modal || !skillInput || !categoryInput || !descriptionInput) {
    console.error("Edit modal elements not found");
    return;
  }

  // Prefill all fields
  skillInput.value = post.skill || "";
  categoryInput.value = post.category || "";
  descriptionInput.value = post.description || "";

  modal.style.display = "flex";
}

// Save edits
function handleEditSave() {
  if (!currentEditingPost) {
    alert("No post selected to edit.");
    return;
  }

  const token = localStorage.getItem("sl_token");
  if (!token) {
    alert("Please log in to edit posts.");
    return;
  }

  const modal = document.getElementById("editModal");
  const skillInput = document.getElementById("editSkillInput");
  const categoryInput = document.getElementById("editCategoryInput");
  const descriptionInput = document.getElementById("editDescriptionInput");

  if (!modal || !skillInput || !categoryInput || !descriptionInput) {
    alert("Edit form is missing fields.");
    return;
  }

  const skill = skillInput.value.trim();
  const category = categoryInput.value.trim();
  const description = descriptionInput.value.trim();

  if (!skill) {
    alert("Skill is required.");
    return;
  }
  if (!category) {
    alert("Category is required.");
    return;
  }
  if (!description) {
    alert("Description is required.");
    return;
  }

  // optional edge cases
  if (skill.length > 30) {
    alert("Skill must be 30 characters or less.");
    return;
  }
  if (description.length < 10) {
    alert("Description must be at least 10 characters.");
    return;
  }

  fetch(`/api/posts/${currentEditingPost.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ skill, category, description }),
  })
    .then((res) => res.json())
    .then((data) => {
      alert(data.message || "Updated.");
      if (data.success) {
        modal.style.display = "none";
        currentEditingPost = null;
        if (window.reloadPosts) window.reloadPosts();
      }
    })
    .catch((err) => {
      console.error(err);
      alert("Error updating post.");
    });
}

// ===== DELETE – supporting feature + confirmation =====
function handleDelete(post) {
  const token = localStorage.getItem("sl_token");
  if (!token) {
    alert("Please log in to delete posts.");
    return;
  }

  if (!confirm("Are you sure you want to delete this post?")) return;

  fetch(`/api/posts/${post.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => res.json())
    .then((data) => {
      alert(data.message);
      if (data.success && window.reloadPosts) window.reloadPosts();
    })
    .catch((err) => {
      console.error(err);
      alert("Error deleting post.");
    });
}

// expose functions globally so Cheng.js click handlers can call them
window.handleEdit = handleEdit;

// NOTE: if you already have handleDelete implemented elsewhere in this file,
// keep it; otherwise Cheng.js' Delete button will fail.
// window.handleDelete = handleDelete;

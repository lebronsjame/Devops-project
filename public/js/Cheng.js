document.addEventListener("DOMContentLoaded", function () {
  // current editing post for modal
  let currentEditing = null;

  function getCurrentUser() {
    return localStorage.getItem('loggedInUser');
  }

  async function getCurrentUserId() {
    const token = localStorage.getItem("sl_token");
    if (!token) return null;
    try {
      const res = await fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.success ? data.user.id : null;
    } catch {
      return null;
    }
  }

  const offerModal = document.getElementById("offerModal");
  const requestModal = document.getElementById("requestModal");

  const addOfferBtn = document.getElementById("addOfferBtn");
  const addRequestBtn = document.getElementById("addRequestBtn");

  const closeOffer = document.getElementById("closeOffer");
  const closeRequest = document.getElementById("closeRequest");

  const offerForm = document.getElementById("offerForm");
  const requestForm = document.getElementById("requestForm");

  const offersList = document.getElementById("offersList");
  const requestsList = document.getElementById("requestsList");

  function addOfferToDOM(name, skill) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${name}:</strong> I can teach ${skill}`;
    offersList.appendChild(li);
  }

  function addRequestToDOM(name, skill) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${name}:</strong> I want to learn ${skill}`;
    requestsList.appendChild(li);
  }

  async function loadData() {
    try {
      const [offersRes, requestsRes] = await Promise.all([
        fetch("/api/offers"),
        fetch("/api/requests"),
      ]);

      const offers = await offersRes.json();
      const requests = await requestsRes.json();

      offersList.innerHTML = "";
      requestsList.innerHTML = "";

      const currentUserId = await getCurrentUserId();

      offers.forEach(o => {
        const li = document.createElement('li');
        const username = o.username || o.name || '';
        const categoryChip = o.category
          ? `<div class="post-category"><span class="category-chip">${String(o.category)}</span></div>`
          : "";
        li.innerHTML = `
          <div class="post-header">
            <strong>${(o.username || o.name || "")}:</strong> I can teach ${o.skill}
          </div>
          ${categoryChip}
          <div class="post-description">
            <small>${o.description || ""}</small>
          </div>
        `;

        if (currentUserId && o.userId && String(o.userId) === String(currentUserId)) {
          const br = document.createElement('br');
          editBtn.addEventListener('click', () => handleEdit(o));

          const delBtn = document.createElement('button');
          delBtn.textContent = 'Delete';
          delBtn.className = 'action-btn delete-btn';
          delBtn.addEventListener('click', () => handleDelete(o));

          li.appendChild(br);
          li.appendChild(editBtn);
          li.appendChild(delBtn);
        }

        offersList.appendChild(li);
      });

      requests.forEach(r => {
        const li = document.createElement('li');

        const categoryBlock = r.category
          ? `<div class="post-category"><span class="category-chip">${String(r.category)}</span></div>`
          : "";

        li.innerHTML = `
          <div class="post-header">
            <strong>${(r.username || r.name || "")}:</strong> I want to learn ${r.skill}
          </div>
          ${categoryBlock}
          <div class="post-description">
            <small>${r.description || ""}</small>
          </div>
        `;

        if (currentUserId && r.userId && String(r.userId) === String(currentUserId)) {
          const actions = document.createElement("div");
          actions.className = "post-actions";

          const editBtn = document.createElement('button');
          editBtn.textContent = 'Edit';
          editBtn.className = 'action-btn edit-btn';
          editBtn.addEventListener('click', () => handleEdit(r));

          const delBtn = document.createElement('button');
          delBtn.textContent = 'Delete';
          delBtn.className = 'action-btn delete-btn';
          delBtn.addEventListener('click', () => handleDelete(r));

          actions.appendChild(editBtn);
          actions.appendChild(delBtn);
          li.appendChild(actions);
        }

        requestsList.appendChild(li);
      });
    } catch (err) {
      console.error("Error loading data from server:", err);
    }
  }
  // expose reload function so other modules (Pavian.js) can request a refresh
  window.reloadPosts = loadData;

  loadData();

  addOfferBtn.onclick = () => offerModal.style.display = "block";
  addRequestBtn.onclick = () => requestModal.style.display = "block";

  closeOffer.onclick = () => offerModal.style.display = "none";
  closeRequest.onclick = () => requestModal.style.display = "none";

  window.onclick = function(e) {
    if (e.target === offerModal) offerModal.style.display = "none";
    if (e.target === requestModal) requestModal.style.display = "none";
  };

  offerForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    const token = localStorage.getItem("sl_token");
    if (!token) {
      alert("Please log in to create an offer.");
      return;
    }

    const skill = document.getElementById("offerSkill").value.trim();
    const category = document.getElementById("offerCategory").value.trim();
    const description = document.getElementById("offerDescription").value.trim();

    if (!skill) return alert("Skill is required.");
    if (!category) return alert("Category is required.");
    if (!description) return alert("Description is required.");

    if (skill.length > 30) return alert("Skill must be 30 characters or less.");
    if (description.length < 10) return alert("Description must be at least 10 characters.");

    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ skill, category, description }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || data.error || "Failed to create offer.");
        return;
      }

      offerModal.style.display = "none";
      offerForm.reset();
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Error creating offer.");
    }
  });

  requestForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    const token = localStorage.getItem("sl_token");
    if (!token) {
      alert("Please log in to create a request.");
      return;
    }

    const skill = document.getElementById("requestSkill").value.trim();
    const category = document.getElementById("requestCategory").value.trim();
    const description = document.getElementById("requestDescription").value.trim();

    if (!skill) return alert("Skill is required.");
    if (!category) return alert("Category is required.");
    if (!description) return alert("Description is required.");

    if (skill.length > 30) return alert("Skill must be 30 characters or less.");
    if (description.length < 10) return alert("Description must be at least 10 characters.");

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ skill, category, description }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || data.error || "Failed to create request.");
        return;
      }

      requestModal.style.display = "none";
      requestForm.reset();
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Error creating request.");
    }
  });

  // Edit/Delete handled by `Pavian.js` (this file only renders posts)
});

document.addEventListener("DOMContentLoaded", function () {

  // --- Modal Elements ---
  const offerModal = document.getElementById("offerModal");
  const requestModal = document.getElementById("requestModal");

  // --- Buttons to open modals ---
  const addOfferBtn = document.getElementById("addOfferBtn");
  const addRequestBtn = document.getElementById("addRequestBtn");

  // --- Close buttons ---
  const closeOffer = document.getElementById("closeOffer");
  const closeRequest = document.getElementById("closeRequest");

  // --- Forms ---
  const offerForm = document.getElementById("offerForm");
  const requestForm = document.getElementById("requestForm");

  // --- Lists to update ---
  const offersList = document.getElementById("offersList");
  const requestsList = document.getElementById("requestsList");

  // -----------------------------
  // OPEN POPUP MODALS
  // -----------------------------
  addOfferBtn.onclick = () => {
    offerModal.style.display = "block";
  };

  addRequestBtn.onclick = () => {
    requestModal.style.display = "block";
  };

  // -----------------------------
  // CLOSE POPUPS (X BUTTON)
  // -----------------------------
  closeOffer.onclick = () => {
    offerModal.style.display = "none";
  };

  closeRequest.onclick = () => {
    requestModal.style.display = "none";
  };

  // -----------------------------
  // CLOSE POPUPS ON OUTSIDE CLICK
  // -----------------------------
  window.onclick = function (event) {
    if (event.target === offerModal) {
      offerModal.style.display = "none";
    }
    if (event.target === requestModal) {
      requestModal.style.display = "none";
    }
  };

  // -----------------------------
  // SUBMIT OFFER FORM
  // -----------------------------
  offerForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("offerName").value.trim();
    const skill = document.getElementById("offerSkill").value.trim();

    if (name === "" || skill === "") return;

    // Add new item to Skill Offers list
    const li = document.createElement("li");
    li.innerHTML = `<strong>${name}:</strong> I can teach ${skill}`;
    offersList.appendChild(li);

    // Close modal + reset form
    offerForm.reset();
    offerModal.style.display = "none";
  });

  // -----------------------------
  // SUBMIT REQUEST FORM
  // -----------------------------
  requestForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("requestName").value.trim();
    const skill = document.getElementById("requestSkill").value.trim();

    if (name === "" || skill === "") return;

    // Add new item to Skill Requests list
    const li = document.createElement("li");
    li.innerHTML = `<strong>${name}:</strong> I want to learn ${skill}`;
    requestsList.appendChild(li);

    // Close modal + reset form
    requestForm.reset();
    requestModal.style.display = "none";
  });

});

// Store user answers
const userAnswers = {};

let products = [];
let questions = [];
let currentQuestionSet = null;
let currentQuestionIndex = 0;
let productsFound = false;

// DOM Elements
const questionnaire = document.getElementById("questionnaire");
const productsCarousel = document.getElementById("products-carousel");
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");
const progressTabs = document.getElementById("progress-tabs");

const colorMap = {
  siyah: "#000000",
  bej: "#cfbaa0",
  beyaz: "#ffffff",
  mavi: "#2196f3",
  kırmızı: "#ff4444",
  yeşil: "#4caf50",
};

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Fetch data
    const productsResponse = await fetch("data/products.json");
    products = await productsResponse.json();

    const questionsResponse = await fetch("data/questions.json");
    questions = await questionsResponse.json();

    // Start with the first question set
    currentQuestionSet = questions[0];
    renderQuestion();
    updateProgressTabs();
  } catch (error) {
    console.error("Error loading data:", error);
  }

  setupNavigationListeners();
});

function renderQuestion() {
  const currentQuestion = currentQuestionSet.steps[currentQuestionIndex];

  let answersHTML = "";

  if (currentQuestion.type === "color" || currentQuestion.subtype === "color") {
    // For color questions, render color options
    answersHTML = currentQuestion.answers
      .map((answer) => {
        const colorValue = colorMap[answer.toLowerCase()] || "#ccc"; // default to gray
        return `<button class="option color-option" data-value="${answer}" style="background: ${colorValue};"></button>`;
      })
      .join("");
  } else {
    // For other questions, render regular options
    answersHTML = currentQuestion.answers
      .map(
        (answer) =>
          `<button class="option" data-value="${answer}">${answer}</button>`
      )
      .join("");
  }

  questionnaire.innerHTML = `
          <div class="question" data-type="${currentQuestion.type}">
              <h2>${currentQuestion.title}</h2>
  
              <div class="options ${currentQuestion.subtype}-options">
                  ${answersHTML}
              </div>
          </div>
      `;

  setupOptionListeners();
  updateNavigationState();
}

function setupOptionListeners() {
  const options = document.querySelectorAll(".option");
  options.forEach((option) => {
    option.addEventListener("click", () => {
      const siblings = option.parentElement.querySelectorAll(".option");
      siblings.forEach((sib) => sib.classList.remove("selected"));
      option.classList.add("selected");

      const currentQuestion = currentQuestionSet.steps[currentQuestionIndex];
      userAnswers[currentQuestion.type] = option.dataset.value;

      nextBtn.disabled = false;

      if (
        currentQuestion.type === "question" &&
        currentQuestion.subtype === "category"
      ) {
        currentQuestionSet = questions.find(
          (q) => q.name === option.dataset.value
        );
      }
    });
  });
}

function setupNavigationListeners() {
  backBtn.addEventListener("click", showPreviousQuestion);
  nextBtn.addEventListener("click", showNextQuestion);
}

function showPreviousQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
    updateProgressTabs();
  }
}

function showNextQuestion() {
  if (currentQuestionIndex < currentQuestionSet.steps.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
    updateProgressTabs();
  } else {
    showResults();
  }
}

function updateNavigationState() {
  backBtn.disabled = currentQuestionIndex === 0;
  nextBtn.disabled =
    !userAnswers[currentQuestionSet.steps[currentQuestionIndex].type];
}

function updateProgressTabs() {
  progressTabs.innerHTML = currentQuestionSet.steps
    .map(
      (_, index) =>
        `<span class="tab ${
          index === currentQuestionIndex ? "active" : ""
        }"></span>`
    )
    .join("");
}

function showResults() {
  const filteredProducts = filterProducts();
  productsFound = filteredProducts.length > 0;

  if (!productsFound) {
    // Show no products message in questionnaire container
    questionnaire.innerHTML = `
      <div class="question">
        <h2>Ürün Bulunamadı</h2>
      </div>
    `;

    // Keep questionnaire visible, hide carousel
    document
      .getElementById("questionnaire-container")
      .classList.remove("hidden");
    productsCarousel.classList.add("hidden");

    // Update navigation state
    backBtn.disabled = false;
    nextBtn.disabled = true;

    // Update progress tabs to show we're still on the last question
    updateProgressTabs();
  } else {
    // Show products in carousel as before
    document.getElementById("questionnaire-container").classList.add("hidden");
    productsCarousel.classList.remove("hidden");
    renderCarousel(filteredProducts);
  }
}

function filterProducts() {
  return products.filter((product) => {
    // Combine category and labels arrays
    const categoryAndLabels = [
      ...(product.category || []),
      ...(product.labels || []),
    ];

    // Check if any category or label matches the user's answer
    const categoryMatch = categoryAndLabels.some((cat) =>
      cat.toLowerCase().includes(userAnswers.question.toLowerCase())
    );

    const colorMatch = product.colors.some(
      (color) => color.toLowerCase() === userAnswers.color
    );

    const priceMatch = matchPrice(product.price, userAnswers.price);

    return categoryMatch && colorMatch && priceMatch;
  });
}

function matchPrice(productPrice, priceRange) {
  const [min, max] = priceRange.split("-").map(Number);
  if (priceRange.endsWith("+")) {
    return productPrice >= min;
  }
  return productPrice >= min && productPrice < max;
}

function renderCarousel(filteredProducts) {
  const carouselTrack = document.querySelector(".carousel-track");
  const carouselProgressTabs = document.getElementById(
    "carousel-progress-tabs"
  );

  /*
  if (filteredProducts.length === 0) {
    carouselTrack.innerHTML = `
      <div class="product-card">
        <p>Ürün Bulunamadı</p>
      </div>
    `;

    // Hide progress tabs when there are no products
    carouselProgressTabs.innerHTML = "";
    return;
  }
  */

  // Render products
  carouselTrack.innerHTML = filteredProducts
    .map(
      (product) => `
        <div class="product-card">
          <div class="image-container">
            <div class="loader">Loading...</div>
            <img 
              data-src="${product.image}" 
              alt="${product.name}"
              loading="lazy"
            >
          </div>
          <h3>${product.name}</h3>
          <div class="price">
            ${
              product.oldPriceText
                ? `<span class="original-price">${product.oldPriceText}</span>`
                : ""
            }
            <span class="${product.priceText ? "sale-price" : ""}">${
        product.priceText
      }</span>
          </div>
          <a href="${
            product.url
          }" target="_blank" class="view-product-btn">ÜRÜNE GİT</a>
        </div>
      `
    )
    .join("");

  setupLazyLoading();

  // Render carousel progress tabs
  carouselProgressTabs.innerHTML = filteredProducts
    .map(
      (_, index) =>
        `<span class="tab ${
          index === 0 ? "active" : ""
        }" data-index="${index}"></span>`
    )
    .join("");

  setupCarousel();
}

function setupLazyLoading() {
  const imageObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          setTimeout(() => {
            img.src = img.dataset.src;

            img.onload = () => {
              img.classList.add("loaded");
              const loader = img.parentElement.querySelector(".loader");
              if (loader) {
                loader.remove();
              }
            };

            observer.unobserve(img);
          }, 300);
        }
      });
    },
    {
      root: null,
      rootMargin: "50px",
      threshold: 0.1,
    }
  );

  // Observe all images
  document.querySelectorAll(".product-card img[data-src]").forEach((img) => {
    imageObserver.observe(img);
  });
}

function setupCarousel() {
  const track = document.querySelector(".carousel-track");
  const prevButton = document.querySelector(".carousel-btn.prev");
  const nextButton = document.querySelector(".carousel-btn.next");
  const tabsNav = document.getElementById("carousel-progress-tabs");
  const tabs = Array.from(tabsNav.children);
  const slides = Array.from(track.children);
  let currentIndex = 0;

  function updateCarousel() {
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    updateTabs();
    updateButtons();
  }

  function updateTabs() {
    tabs.forEach((tab, index) => {
      tab.classList.toggle("active", index === currentIndex);
    });
  }

  function updateButtons() {
    prevButton.disabled = currentIndex === 0;
    nextButton.disabled = currentIndex === slides.length - 1;
  }

  prevButton.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      updateCarousel();
    }
  });

  nextButton.addEventListener("click", () => {
    if (currentIndex < slides.length - 1) {
      currentIndex++;
      updateCarousel();
    }
  });

  // Add click event to tabs
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      currentIndex = index;
      updateCarousel();
    });
  });

  // Initialize the carousel position
  updateCarousel();
}

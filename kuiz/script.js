//memunculkan list kuis berdasarkan folder yang terdapat dalam folder soal

const webAppUrl =
  "https://script.google.com/macros/s/AKfycbzVIBIvjN3_cEjtRxwG5wHzi3lN9WIcaCitgDcBfAeJbraI24YbwE1Wd591UX3MIOzsFw/exec";
const GAS_SUBMIT_URL =
  "https://script.google.com/macros/s/AKfycbzueraoyehiJvXSmAP2BpkkKWbPgQHZmhGmnh5QZW8PU-bus3In0o3kyNLQz3otygdL/exec";
async function submitQuizData(payload, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(GAS_SUBMIT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.status === "success") return { success: true };
    } catch (error) {
      console.warn(`Percobaan kirim ke-${attempt} gagal...`);
      if (attempt === maxRetries) {
        saveToOfflineQueue(payload);
        return { success: false, isOfflineSaved: true };
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
}

function saveToOfflineQueue(payload) {
  const queue = JSON.parse(
    localStorage.getItem("quiz_pending_submissions") || "[]",
  );
  queue.push({ ...payload, failedAt: new Date().toISOString() });
  localStorage.setItem("quiz_pending_submissions", JSON.stringify(queue));
}
function showLoading(show, text = "") {
  const overlay = document.getElementById("loadingOverlay");
  const loadingText = document.getElementById("loadingText");
  if (overlay) {
    if (show) {
      if (loadingText) loadingText.textContent = text;
      overlay.classList.remove("hidden");
    } else {
      overlay.classList.add("hidden");
    }
  }
}
let quizList = [];
let questions = [];

function setTheme(theme) {
  const toggleBtn = document.getElementById("themeToggleBtn");

  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("quiz_theme", "light");
    if (toggleBtn) toggleBtn.innerHTML = "☀️ Light";
  } else {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("quiz_theme", "dark");
    if (toggleBtn) toggleBtn.innerHTML = "🌙 Dark";
  }
}
// Event listener klik tombol toggle tema
document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "themeToggleBtn") {
    const currentTheme = localStorage.getItem("quiz_theme") || "dark";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  }
});

// Pulihkan tema tersimpan saat halaman dimuat (DOMContentLoaded)
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("quiz_theme") || "dark";
  setTheme(savedTheme);
});
function clearQuizSession() {
  localStorage.removeItem("quiz_end_time");
  localStorage.removeItem("quiz_answers");
  localStorage.removeItem("quiz_current_index");
  localStorage.removeItem("quiz_questions");
  localStorage.removeItem("quiz_user");
  localStorage.removeItem("quiz_title");
}
function restoreSession() {
  /**fungsi ini bertujuan untuk memastikan agar kuis dapat memuat informasi yang tersimpan bahkan saat ter refresh atau dalam keadaan signal yang jelek  */
  const endTime = localStorage.getItem("quiz_end_time");
  const savedAnswers = localStorage.getItem("quiz_answers");
  const savedIndex = localStorage.getItem("quiz_current_index");
  const savedQuestions = localStorage.getItem("quiz_questions");
  const savedUser = localStorage.getItem("quiz_user");
  const savedDuration = localStorage.getItem("quiz_duration");
  const savedTitle = localStorage.getItem("quiz_title");
  // Jika ada data timer & soal tersimpan, berarti kuis masih berlangsung
  if (endTime && savedQuestions) {
    try {
      questions = JSON.parse(savedQuestions);
      state.answers = savedAnswers
        ? JSON.parse(savedAnswers)
        : Array(questions.length).fill(null);
      state.currentIndex = savedIndex ? parseInt(savedIndex, 10) : 0;
      state.user = savedUser ? JSON.parse(savedUser) : { nama: "Peserta" };
      state.durasiMenit = savedDuration ? parseInt(savedDuration, 10) : 20;

      const elInfoUser = document.getElementById("infoUser");
      if (elInfoUser && state.user) {
        // Sesuaikan dengan struktur object state.user Anda (misal: state.user.nama atau state.user)
        const namaPeserta =
          typeof state.user === "object" ? state.user.nama : state.user;
        elInfoUser.textContent = ` ${namaPeserta}`;
      }

      const elBrand = document.querySelector(".brand");
      if (elBrand && savedTitle) {
        elBrand.textContent = savedTitle;
      }
      // Langsung pindah ke tampilan kuis
      showSection("quiz");
      startTimer(); // startTimer akan otomatis membaca 'quiz_end_time' dari localStorage
      mountNav();
      goTo(state.currentIndex);
    } catch (e) {
      console.error("Gagal memulihkan sesi kuis:", e);
      clearQuizSession();
    }
  }
}

// Jalankan pemulihan saat seluruh halaman HTML selesai dimuat
document.addEventListener("DOMContentLoaded", restoreSession);

const el = (sel) => document.querySelector(sel);
const els = (sel) => Array.from(document.querySelectorAll(sel));
const shuffle = (arr) =>
  arr
    .map((v) => [Math.random(), v])
    .sort((a, b) => a[0] - b[0])
    .map((x) => x[1]);

// memunculkan dropdown pada pilihan kuis
function renderQuizList(list) {
  const sel = el("#quizSelect");
  sel.innerHTML = '<option value=""> -- pilih kuis --</option>';
  list.forEach((q) => {
    const o = document.createElement("option");
    o.value = q.testID;
    o.textContent = q.testTitle;
    sel.appendChild(o);
  });
}
async function muatDaftarKuisAwal() {
  try {
    const res = await fetch(webAppUrl);
    quizList = await res.json();
    renderQuizList(quizList);
  } catch (error) {
    console.error("gagal memuat kuis", error);
    el("#quizSelect").innerHTML =
      '<option value="">gagal memuat data kuis</option>';
  }
}

muatDaftarKuisAwal();

el("#quizSearch").addEventListener("input", (e) => {
  const k = e.target.value.toLowerCase();
  renderQuizList(quizList.filter((q) => q.testTitle.toLowerCase().includes(k)));
});

// fungsi di bawah ini digunakan untuk mengacak urutan opsi dengan menyesuaikan index jawaban yang telah ada
function shuffleOptions(q) {
  let opsiArray = [];

  try {
    if (typeof q.options === "string") {
      opsiArray = JSON.parse(q.options);
    } else {
      opsiArray = q.options || [];
    }
  } catch (e) {
    console.error("gagal parse opsi:", e);
    opsiArray = [];
  }

  let indeksJawabanAsli = parseInt(q.answer);

  let opts = opsiArray.map((opt, i) => ({ opt: String(opt).trim(), i }));
  opts = shuffle(opts);
  let newAnswer = opts.findIndex((o) => o.i === indeksJawabanAsli);

  return {
    type: q.questionType || "umum",
    q: q.questions,
    options: opts.map((o) => o.opt),
    answer: newAnswer,
  };
}

let state = {
  user: null,
  timeLeft: null,
  currentIndex: 0,
  answers: [],
};

let timerInterval = null;

function startTimer(durasiMenit) {
  if (timerInterval) clearInterval(timerInterval);
  let endTime = localStorage.getItem("quiz_end_time");

  if (!endTime || endTime == "NaN") {
    endTime = Date.now() + durasiMenit * 60 * 1000;
    localStorage.setItem("quiz_end_time", endTime);
  } else {
    endTime = parseInt(endTime, 10);
  }

  function hitungWaktu() {
    const sekarang = Date.now();
    const sisaDetik = Math.max(0, Math.floor((endTime - sekarang) / 1000));

    // Jika waktu habis
    if (sisaDetik <= 0) {
      clearInterval(timerInterval);
      localStorage.removeItem("quiz_end_time"); // Hapus target waktu
      alert("Waktu kuis telah habis!");
      submitQuiz(); // Panggil fungsi submit kuis otomatis
      return;
    }

    // Format tampilan Menit:Detik (MM:SS)
    const m = String(Math.floor(sisaDetik / 60)).padStart(2, "0");
    const s = String(sisaDetik % 60).padStart(2, "0");

    // Tampilkan ke elemen UI timer Anda
    const elTimer = el("#timer"); // Sesuaikan ID elemen timer Anda
    if (elTimer) {
      if (sisaDetik <= 60) {
        elTimer.style.background = "#fa000077";
        elTimer.style.borderColor = "#7f1d1dab";
      } else {
        elTimer.style.background = "";
        elTimer.style.borderColor = "";
      }
      elTimer.textContent = `${m}:${s}`;
    }
  }

  // Eksekusi sekali secara langsung agar UI tidak 'lag' 1 detik di awal
  hitungWaktu();

  // Jalankan interval setiap 1 detik
  timerInterval = setInterval(hitungWaktu, 1000);
}

function mountNav() {
  const nav = el("#nav");
  nav.innerHTML = "";
  questions.forEach((q, idx) => {
    const b = document.createElement("button");
    b.textContent = idx + 1;
    b.addEventListener("click", () => {
      goTo(idx);
    });
    nav.appendChild(b);
  });
  updateNavActive();
}

function updateNavActive() {
  const buttons = els("#nav button");
  buttons.forEach((b, idx) => {
    b.classList.toggle("active", idx === state.currentIndex);
    b.classList.toggle("done", state.answers[idx] !== null);
  });
  el("#infoSoal").textContent = `Soal ${state.currentIndex + 1} / ${
    questions.length
  }`;
  el("#infoKategori").textContent = `Kategori: ${questions[
    state.currentIndex
  ].type.toUpperCase()}`;
}
const FONT_SIZES = {
  small: "14px",
  medium: "16px",
  large: "19px",
};
function setFontSize(size) {
  const pixelSize = FONT_SIZES[size] || FONT_SIZES.medium;
  const targetSize = FONT_SIZES[size] ? size : "medium";

  // Ubah nilai variabel CSS di :root
  document.documentElement.style.setProperty("--base-font-size", pixelSize);

  // Simpan ke localStorage
  localStorage.setItem("quiz_font_size", targetSize);

  // Update status tombol aktif di UI
  document.querySelectorAll(".btn-font").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.size === targetSize);
  });
}

// Event Delegation untuk Klik Tombol Font
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-font");
  if (btn && btn.dataset.size) {
    setFontSize(btn.dataset.size);
  }
});

// Pulihkan ukuran font tersimpan saat pertama kali dimuat
document.addEventListener("DOMContentLoaded", () => {
  const savedSize = localStorage.getItem("quiz_font_size") || "medium";
  setFontSize(savedSize);
});

function renderQuestion() {
  const q = questions[state.currentIndex];
  const container = el("#questionArea");
  container.innerHTML = "";
  const title = document.createElement("div");
  title.className = "q-title";

  let teksSoal = q.q;

  if (typeof teksSoal === "string") {
    // Mengubah double backslash (\\) menjadi single backslash (\) agar MathJax mengenali \( dan \)
    teksSoal = teksSoal.replace(/\\\\/g, "\\");
  }

  title.innerHTML = teksSoal;
  container.appendChild(title);

  const list = document.createElement("div");
  list.className = "choices";
  q.options.forEach((opt, i) => {
    const row = document.createElement("label");
    row.className = "choice";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "choice";
    input.value = i;
    input.checked = state.answers[state.currentIndex] === i;
    input.addEventListener("change", () => {
      state.answers[state.currentIndex] = i;
      localStorage.setItem("quiz_answers", JSON.stringify(state.answers));
      updateNavActive();
    });
    const span = document.createElement("div");
    span.innerHTML = opt;
    row.appendChild(input);
    row.appendChild(span);
    list.appendChild(row);
  });
  container.appendChild(list);
  if (window.MathJax && typeof MathJax.typeset === "function") {
    MathJax.typeset();
  }
}

function goTo(idx) {
  state.currentIndex = Math.max(0, Math.min(questions.length - 1, idx));
  localStorage.setItem("quiz_current_index", state.currentIndex);
  updateNavActive();
  renderQuestion();
}

function next() {
  if (state.currentIndex < questions.length - 1) {
    goTo(state.currentIndex + 1);
  }
}
function prev() {
  if (state.currentIndex > 0) {
    goTo(state.currentIndex - 1);
  }
}

function resetAnswers() {
  if (!confirm("Yakin reset semua jawaban?")) return;
  state.answers = Array(questions.length).fill(null);
  localStorage.setItem("quiz_answers", JSON.stringify(state.answers));
  updateNavActive();
  renderQuestion();
}

async function submitQuiz() {
  document.title = "hasil Ujian";
  // hitung skor per kategori
  let totalBenar = 0;
  let totalSalah = 0;
  let totalKosong = 0;

  questions.forEach((q, idx) => {
    const pick = state.answers[idx];
    const correct = q.answer;
    if (pick === undefined || pick === null) {
      totalKosong++;
    } else if (pick === correct) {
      totalBenar++;
    } else {
      totalSalah++;
    }
  });
  const total = totalBenar;
  const totalSoal = questions.length;
  const skorAkhir = totalBenar * 5;
  const username =
    typeof state.user === "object" ? state.user.nama : state.user || "Peserta";
  const totalDetik = Math.floor((Date.now() - state.timeStart) / 1000);
  const menit = Math.floor(totalDetik / 60);
  const detik = totalDetik % 60;
  const durasiFormatted = `${menit} menit ${detik} detik`;
  // tampilkan
  let total_question = questions.length;
  payLoad = {
    userName: username,
    testID: state.testID,
    testTitle: state.testTitle,
    finalScore: skorAkhir,
    correctAnswer: totalBenar,
    wrongAnswer: totalSalah,
    notAnswer: totalKosong,
    timeTaken: durasiFormatted,
  };
  showLoading(true, "Menyimpan Hasil Pengerjaan...");

  const response = await submitQuizData(payLoad);

  showLoading(false);

  el("#scoreTotal").textContent = `${total} / ${total_question}`;
  el("#resultUser").textContent = `Peserta: ${
    state.user?.nama || "-"
  } (waktu habis/kumpul)`;

  // stop timer, ganti section
  if (timerInterval) clearInterval(timerInterval);

  showSection("result");
  if (response && response.isOfflineSaved) {
    alert(
      "Koneksi lambat. Hasil Anda telah tersimpan aman di perangkat ini dan akan otomatis tersinkronisasi saat online.",
    );
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
  clearQuizSession();
}

function showSection(which) {
  el("#section-form").classList.remove("active");
  el("#section-quiz").classList.remove("active");
  el("#section-result").classList.remove("active");
  if (which === "form") el("#section-form").classList.add("active");
  if (which === "quiz") el("#section-quiz").classList.add("active");
  if (which === "result") el("#section-result").classList.add("active");
}

// EVENTS

el("#btnMulai").addEventListener("click", async () => {
  const nama = el("#nama").value.trim();
  const pass = el("#pass").value.trim();
  const quizId = el("#quizSelect").value;

  if (!nama || !pass || !quizId) {
    alert("Lengkapi semua isian");
    return;
  }

  const btnAsli = el("#btnMulai").textContent;
  el("#btnMulai").textContent = "memuat kuis";
  el("#btnMulai").disabled = true;

  try {
    const res = await fetch(`${webAppUrl}?id=${quizId}`);
    const data = await res.json();
    console.log("Durasi dari sheet:", data.testDuration);

    if (data.error) {
      alert(data.error);
      return;
    }

    if (data.testPassword && data.testPassword.toString().trim() !== pass) {
      alert(
        "Password salah, untuk mendapatkan Password silahkan berlangganan di Education Priority",
      );
      return;
    }
    if (!data.questions || data.questions.length === 0) {
      alert(
        "soal belum tersedia atau waktu telah kedaluarsa, Mohon menunggu pembaharuan!. jika waktu telah benar, mohon hubungi admin Education Priority",
      );
      return;
    }
    questions = data.questions.map((q, i) => ({
      id: i + 1,
      ...shuffleOptions(q),
    }));

    state.answers = Array(questions.length).fill(null);
    state.user = { nama };
    state.testID = data.testID;
    state.testTitle = data.testTitle;
    state.timeStart = Date.now();

    const durasiMenit = parseInt(data.testDuration) || 20;
    state.timeLeft = durasiMenit;
    state.durasiMenit = durasiMenit;
    el("#infoUser").textContent = ` peserta: ${nama}`;
    el(".brand").textContent = data.testTitle || "kuis aktif";
    // memastikan agar saat di refresh soal dan jawaban tetap dapat terload
    localStorage.setItem("quiz_questions", JSON.stringify(questions));
    localStorage.setItem("quiz_user", JSON.stringify(state.user));
    localStorage.setItem("quiz_duration", durasiMenit);
    localStorage.setItem("quiz_title", JSON.stringify(data.testTitle));
    localStorage.removeItem("quiz_end_time");

    showSection("quiz");
    document.title = ` test ${data.testTitle}`;
    startTimer(durasiMenit);
    mountNav();
    goTo(0);
  } catch (error) {
    console.error("error saat memulai kuis", error);
    alert("terjadi kesalahan koneksi saat mengunduh soal.");
  } finally {
    el("#btnMulai").textContent = btnAsli;
    el("#btnMulai").disabled = false;
  }
});

/** 
el("#btnMulai").addEventListener("click", () => {
  const nama = el("#nama").value.trim();
  const pass = el("#pass").value.trim();
  if (!nama || !pass) {
    alert("Nama dan password wajib diisi.");
    return;
  }
  if (pass !== "JADITARUNA") {
    alert(
      "password salah! tanya password ke sir hardi. klo sir hardi dak tau tanya ke sir meca",
    );
    return;
  }


  state.user = { nama, pass };
  el("#infoUser").textContent = `Peserta: ${nama}`;
  showSection("quiz");
  startTimer();
  mountNav();
  goTo(0);
  renderTimer();
});
*/

el("#prevBtn").addEventListener("click", prev);
el("#nextBtn").addEventListener("click", next);
el("#btnReset").addEventListener("click", resetAnswers);
el("#btnSubmit").addEventListener("click", () => {
  if (confirm("Kumpulkan jawaban sekarang?")) submitQuiz();
});

// Keyboard nav: panah kiri/kanan, angka 1-4 untuk memilih A-D
window.addEventListener("keydown", (e) => {
  if (!el("#section-quiz").classList.contains("active")) return;
  if (e.key === "ArrowRight") next();
  if (e.key === "ArrowLeft") prev();
  if (["1", "2", "3", "4"].includes(e.key)) {
    const idx = parseInt(e.key) - 1;
    state.answers[state.currentIndex] = idx;
    localStorage.setItem("quiz_answers", JSON.stringify(state.answers));
    updateNavActive();
    renderQuestion();
  }
});

// Ulang dari hasil
el("#btnUlang").addEventListener("click", () => {
  state.currentIndex = 0;
  state.answers = Array(questions.length).fill(null);

  questions = shuffle(questions);

  localStorage.removeItem("quiz_end_time");

  localStorage.setItem("quiz_questions", JSON.stringify(questions));
  localStorage.setItem("quiz_answers", JSON.stringify(state.answers));
  const durasi =
    state.durasiMenit ||
    parseInt(localStorage.getItem("quiz_duration"), 10) ||
    20;

  showSection("quiz");
  startTimer(state.durasiMenit);
  mountNav();
  goTo(0);
});

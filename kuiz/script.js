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
// Variabel global untuk menyimpan referensi ID interval

function clearQuizSession() {
  stopTimer();
  // hapus semua cache agar memori lebih bersih dan menghindari bug saat merefresh jawaban
  localStorage.removeItem("quiz_end_time");
  localStorage.removeItem("quiz_answers");
  localStorage.removeItem("quiz_current_index");
  localStorage.removeItem("quiz_questions");
  localStorage.removeItem("quiz_user");
  localStorage.removeItem("quiz_title");
  localStorage.removeItem("testID");
  localStorage.removeItem("testTitle");
  localStorage.removeItem("timeStart");

  let elBrand = document.querySelector(".brand");
  elBrand.textContent = "Ujian Education Priority";
  let elInfoUser = document.getElementById("infoUser");
  elInfoUser.textContent = "Belum login";
  // kebali ke initial state agar tidak menimbulkan data dowble
  // state = JSON.parse(JSON.stringify(initialState));

  console.log("Sesi kuis dan state berhasil dibersihkan!", state);
}
function restoreSession() {
  /**fungsi ini bertujuan untuk memastikan agar kuis dapat memuat informasi yang tersimpan bahkan saat ter refresh atau dalam keadaan signal yang jelek  */
  const endTime = localStorage.getItem("quiz_end_time");
  // endTime bertipe integer
  const savedAnswers = localStorage.getItem("quiz_answers");
  // savaed
  const savedIndex = localStorage.getItem("quiz_current_index");
  const savedQuestions = localStorage.getItem("quiz_questions");
  const savedUser = localStorage.getItem("quiz_user");
  const savedDuration = localStorage.getItem("quiz_duration");
  const savedTitle = localStorage.getItem("quiz_title");
  const savedtestID = localStorage.getItem("testID");

  const savedTimeStart = localStorage.getItem("timeStart");
  // time start bertipe integer

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
      state.testID = savedtestID;
      state.testTitle = savedTitle;
      state.timeStart = savedTimeStart;

      let elInfoUser = document.getElementById("infoUser");
      if (elInfoUser && state.user) {
        // Sesuaikan dengan struktur object state.user Anda (misal: state.user.nama atau state.user)
        const namaPeserta =
          typeof state.user === "object" ? state.user.nama : state.user;
        elInfoUser.textContent = ` ${namaPeserta}`;
      }

      let elBrand = document.querySelector(".brand");
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
  } else {
    showSection("dashboard");
  }
}
function initDashboardActions() {
  // A. Handling Tombol "Mulai" pada Kartu Prioritas
  const startButtons = document.querySelectorAll(".btn-start-quiz");
  startButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // Ambil elemen kartu terdekat untuk membaca dataset
      const card = e.target.closest(".quiz-card");
      if (!card) return;

      const testID = card.getAttribute("data-testid");
      const testTitle = card.getAttribute("data-title");

      // Set ke state aplikasi
      state.testID = testID;
      state.testTitle = testTitle;

      // Persist ke localStorage agar aman dari refresh
      localStorage.setItem("testID", JSON.stringify(state.testID));
      localStorage.setItem("testTitle", JSON.stringify(state.testTitle));

      // Isi otomatis dropdown/input pilihan ujian di form login
      const inputTestID = el("#inputTestID"); // Sesuaikan ID input/select Anda
      if (inputTestID) {
        inputTestID.value = state.testID;
      }

      // Pindah ke section form login
      showSection("form");
    });
  });

  // B. Handling Tombol "Leaderboard" pada Kartu Prioritas
  const leaderboardButtons = document.querySelectorAll(".btn-view-leaderboard");
  leaderboardButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const card = e.target.closest(".quiz-card");
      if (!card) return;

      const testID = card.getAttribute("data-testid");
      const testTitle = card.getAttribute("data-title");

      // Simpan konteks kuis yang ingin dilihat ke state
      state.testID = testID;
      state.testTitle = testTitle;

      localStorage.setItem("testID", JSON.stringify(state.testID));
      localStorage.setItem("testTitle", JSON.stringify(state.testTitle));

      // Pindah ke section leaderboard & muat data dari GAS
      showSection("leaderboard");
      if (typeof loadLeaderboardData === "function") {
        loadLeaderboardData(testID);
      }
    });
  });

  // C. Handling Tombol "Pilih & Cari Ujian Lainnya"
  const btnOtherQuizzes = el("#btnOtherQuizzes");
  if (btnOtherQuizzes) {
    btnOtherQuizzes.addEventListener("click", () => {
      // Kosongkan/reset state kuis tergolong
      state.testID = "";
      state.testTitle = "";

      localStorage.removeItem("testID");
      localStorage.removeItem("testTitle");

      // Reset pilihan di form login jika ada
      const inputTestID = el("#inputTestID");
      if (inputTestID) {
        inputTestID.value = ""; // Peserta memilih kuis sendiri di form
      }

      // Pindah langsung ke section form login
      showSection("form");
    });
  }
}

// Jalankan pemulihan saat seluruh halaman HTML selesai dimuat
document.addEventListener("DOMContentLoaded", () => {
  // 1. Inisialisasi Tampilan (Tema & Ukuran Font)
  const savedTheme = localStorage.getItem("quiz_theme") || "dark";
  setTheme(savedTheme);

  const savedSize = localStorage.getItem("quiz_font_size") || "medium";
  setFontSize(savedSize);

  // 2. Aktifkan Listener Tombol-Tombol Dashboard
  // (Dipasang lebih awal agar tombol siap saat pengguna berada di Dashboard)
  initDashboardActions();

  // 3. Tentukan Section yang Tampil (Quiz atau Dashboard)
  // Fungsi ini otomatis memanggil showSection("quiz") ATAU showSection("dashboard")
  restoreSession();
});
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
const initialState = {
  questions: [],
  answers: {},
  currentIndex: 0,
  user: null,
  testID: null,
  testTitle: "",
  timeStart: null,
  endTime: null,
};
let state = { ...initialState };

let timerInterval = null;

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval); // Hentikan detikannya di RAM
    timerInterval = null; // Kosongkan referensinya
  }

  // Opsional: Reset teks UI timer
  const elTimer = el("#timer");
  if (elTimer) {
    elTimer.textContent = "--:--";
    elTimer.style.background = "";
    elTimer.style.borderColor = "";
  }
}

function startTimer(durasiMenit) {
  stopTimer();
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
  // 1. Sembunyikan/Nonaktifkan SEMUA section yang ada
  document.querySelectorAll(".section").forEach((sec) => {
    sec.classList.remove("active");
  });

  // 2. Aktifkan HANYA section yang dipanggil
  const target = el(`#section-${which}`);
  if (target) {
    target.classList.add("active");
  } else {
    console.error(`Section dengan ID #section-${which} tidak ditemukan!`);
  }
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

    localStorage.setItem("testID", state.testID);
    state.testTitle = data.testTitle;

    state.timeStart = Date.now();
    localStorage.setItem("timeStart", state.timeStart);

    const durasiMenit = parseInt(data.testDuration) || 20;
    state.timeLeft = durasiMenit;
    state.durasiMenit = durasiMenit;
    el("#infoUser").textContent = ` peserta: ${nama}`;
    el(".brand").textContent = data.testTitle || "kuis aktif";
    // memastikan agar saat di refresh soal dan jawaban tetap dapat terload
    localStorage.setItem("quiz_questions", JSON.stringify(questions));
    localStorage.setItem("quiz_user", JSON.stringify(state.user));
    localStorage.setItem("quiz_duration", durasiMenit);
    localStorage.setItem("quiz_title", data.testTitle);
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

el("#prevBtn").addEventListener("click", prev);
el("#nextBtn").addEventListener("click", next);
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

if (el("#btnShowLeaderboard")) {
  console.log("tombol leaderboard di eksekusi");
  el("#btnShowLeaderboard").addEventListener("click", () => {
    showSection("leaderboard");
    fetchLeaderboard(state.testID);
  });
}

if (el("#btnBackToResult")) {
  el("#btnBackToResult").addEventListener("click", () => {
    showSection("result");
  });
}

// Fungsi Fetch Data dari Apps Script
async function fetchLeaderboard(testID) {
  console.log("1. Fungsi fetchLeaderboard dipanggil. testID =", testID);
  const tbody = el("#leaderboardBody");

  if (!tbody) {
    console.error("CRITICAL: Elemen #leaderboardBody tidak ditemukan di HTML!");
    return;
  }
  tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Memuat data peringkat...</td></tr>`;

  try {
    const response = await fetch(
      `${GAS_SUBMIT_URL}?action=getLeaderboard&testID=${encodeURIComponent(testID)}`, //ganti verbal001 menjadi test id setelah debuging selesai
    );
    console.log("2. Mengirim request ke URL:");
    console.log("3. Response HTTP diterima:", response);
    const result = await response.json();
    console.log("4. Parsed JSON dari GAS:", result);

    if (result.status === "success" && result.data.length > 0) {
      console.log(
        "5. Format data valid. Jumlah baris data:",
        result.data.length,
      );
      tbody.innerHTML = "";
      result.data.forEach((item, index) => {
        const badge =
          index === 0 ? "🥇 " : index === 1 ? "🥈 " : index === 2 ? "🥉 " : "";
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${badge}${index + 1}</td>
          <td>${escapeHtml(item.userName)}</td>
          <td><strong>${item.score}</strong></td>
          <td>${item.timeTaken}</td>
        `;
        tbody.appendChild(row);
      });
      console.log("6. Berhasil merender tabel leaderboard!");
    } else {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Belum ada data peringkat untuk kuis ini.</td></tr>`;
    }
  } catch (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">Gagal memuat peringkat.</td></tr>`;
  }
}

// Helper sederhana untuk keamanan teks HTML
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const btnleadDash = el("#btnBacktoDashboardFromleaderboard");
if (btnleadDash) {
  btnleadDash.addEventListener("click", () => {
    //console.log("Tombol Kembali ke Dashboard dari Leaderboard diklik");
    showSection("dashboard");
  });
}
const btnResultDash = el("#btnBacktoDashboardFromResult");
if (btnResultDash) {
  btnResultDash.addEventListener("click", () => {
    //console.log("Tombol Kembali ke Dashboard dari Leaderboard diklik");
    showSection("dashboard");
  });
}
const btnFormtDash = el("#btnBacktoDashboardFromform");
if (btnFormtDash) {
  btnFormtDash.addEventListener("click", () => {
    //console.log("Tombol Kembali ke Dashboard dari Leaderboard diklik");
    showSection("dashboard");
  });
}
const btnkuizDash = el("#btnBacktoDashboardFromkuiz");
if (btnkuizDash) {
  btnkuizDash.addEventListener("click", () => {
    // 1. Tampilkan dialog konfirmasi
    const isSure = confirm(
      "Apakah Anda yakin ingin keluar dari kuis?\n\nProgres pengerjaan dan waktu ujian Anda akan dihentikan.",
    );

    // 2. Jika pengguna mengklik "OK" (isSure === true)
    if (isSure) {
      // Hapus seluruh data sesi kuis di localStorage
      if (typeof clearQuizSession === "function") {
        clearQuizSession();
        state = JSON.parse(JSON.stringify(initialState));
      }

      // (Opsional) Hentikan interval timer jika sedang berjalan
      if (typeof stopTimer === "function") {
        stopTimer();
      }

      // Alihkan layar kembali ke Dashboard
      showSection("dashboard");
    }
    // Jika pengguna memilih "Batal", tidak ada tindakan yang terjadi dan kuis tetap berjalan.
  });
}

//memunculkan list kuis berdasarkan folder yang terdapat dalam folder soal

const webAppUrl = "https://script.google.com/macros/s/AKfycbzVIBIvjN3_cEjtRxwG5wHzi3lN9WIcaCitgDcBfAeJbraI24YbwE1Wd591UX3MIOzsFw/exec";

let quizList = [];
let questions = [];

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
    o.textContent = q.testTittle;
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
  renderQuizList(quizList.filter((q) => q.title.toLowerCase().includes(k)));
});

const SOAL_fungsi = [].map((x) => ({
  type: "jarak kecepatan waktu",
  q: x.q,
  options: x.o,
  answer: x.a,
}));

S_fungsi = shuffle(SOAL_fungsi);

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
  opts=shuffle(opts);
  let newAnswer = opts.findIndex((o)=> o.i === indeksJawabanAsli);

  return {
    type: q.questionType|| "umum",
    q: q.questions,
    options: opts.map((o)=o.opt),
    answer= newAnswer,
  }
}


//*/
let QUESTIONS = [...S_fungsi].map((q, i) => ({
  id: i + 1,
  ...shuffleOptions(q),
}));

let state = {
  user: null,
  timeLeft: 15 * 60, // 25 menit
  currentIndex: 0,
  answers: Array(180).fill(null), // simpan index jawaban (0..3) atau null
};

/** RENDERING **/
function formatTime(s) {
  const m = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const r = (s % 60).toString().padStart(2, "0");
  return `${m}:${r}`;
}

function renderTimer() {
  el("#timer").textContent = formatTime(state.timeLeft);
  if (state.timeLeft <= 60) {
    el("#timer").style.background = "#331a1a";
    el("#timer").style.borderColor = "#7f1d1d";
  }
  if (state.timeLeft <= 0) {
    submitQuiz();
  }
}

let tick = null;
function startTimer() {
  if (tick) clearInterval(tick);
  tick = setInterval(() => {
    state.timeLeft--;
    renderTimer();
    if (state.timeLeft <= 0) clearInterval(tick);
  }, 1000);
}

function mountNav() {
  const nav = el("#nav");
  nav.innerHTML = "";
  QUESTIONS.forEach((q, idx) => {
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
    QUESTIONS.length
  }`;
  el("#infoKategori").textContent = `Kategori: ${QUESTIONS[
    state.currentIndex
  ].type.toUpperCase()}`;
}

function renderQuestion() {
  const q = QUESTIONS[state.currentIndex];
  const container = el("#questionArea");
  container.innerHTML = "";
  const title = document.createElement("div");
  title.className = "q-title";

  title.innerHTML = q.q;
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
      updateNavActive();
    });
    const span = document.createElement("div");
    span.innerHTML = opt;
    row.appendChild(input);
    row.appendChild(span);
    list.appendChild(row);
  });
  container.appendChild(list);
  MathJax.typeset();
}

function goTo(idx) {
  state.currentIndex = Math.max(0, Math.min(QUESTIONS.length - 1, idx));
  updateNavActive();
  renderQuestion();
}

function next() {
  if (state.currentIndex < QUESTIONS.length - 1) {
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
  state.answers = Array(QUESTIONS.length).fill(null);
  updateNavActive();
  renderQuestion();
}

function submitQuiz() {
  // hitung skor per kategori
  let sSin = 0,
    sAnt = 0,
    sHip = 0;
  QUESTIONS.forEach((q, idx) => {
    const pick = state.answers[idx];
    const correct = q.answer;
    if (pick === correct) {
      if (q.type === "jarak kecepatan waktu") sSin++;
    }
  });
  const total = sSin + sAnt + sHip;

  // tampilkan
  let total_question = QUESTIONS.length;

  el("#scoreTotal").textContent = `${total} / ${total_question}`;
  el("#resultUser").textContent = `Peserta: ${
    state.user?.nama || "-"
  } (waktu habis/kumpul)`;

  // stop timer, ganti section
  if (tick) clearInterval(tick);
  showSection("result");
  window.scrollTo({ top: 0, behavior: "smooth" });
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

  const btnAsli = el("btnMulai").textContent;
  el("btnMulai").textContent = "memuat kuis";
  el("#btnMulai").disabled= true;

  try{
    const res = await fetch(`${webAppUrl}?id=${quizId}`);
    const data = await res.json();

    if (data.error){
      alert(data.error);
    return;
    }

  if (data.testPassword && data.testPassword.toString().trim() !== pass) {
    alert("Password salah, untuk mendapatkan Password silahkan berlangganan di Education Priority");
    return;
  }
  if (!data.questions || data.questions.length === 0 ){
    alert("soal belum tersedia atau waktu telah kedaluarsa, Mohon menunggu pembaharuan!. jika waktu telah benar, mohon hubungi admin Education Priority");
    return
  }
  questions = data.questions.map((q,i) =>({
    id: i+1,
    ...shuffleOptions(q),

  }));
  state.user = {nama}
  const durasiMenit = parseInt(data.testDuration) || 20;
  state.timeLeft = durasiMenit*60;
  el("#infoUser").textContent = ` peserta: ${nama}`;
  el(".brand").textContent = data.testTitle || "kuis aktif"

  showSection("quiz");
  startTimer();
  mountNav();
  goTo(0);
  renderTimer();
}catch(error){
  console.error("error saat memulai kuis",error);
  alert("terjadi kesalahan koneksi saat mengunduh soal.");
 } finally{
  el("#btnMulai").textContent = btnAsli;
  el("btnMulai").disabled = false;
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
    updateNavActive();
    renderQuestion();
  }
});

// Ulang dari hasil
el("#btnUlang").addEventListener("click", () => {
  state = {
    user: state.user,
    timeLeft: 15 * 60,
    currentIndex: 0,
    answers: Array(180).fill(null),
  };
  QUESTIONS = shuffle(QUESTIONS); // acak ulang urutan
  showSection("quiz");
  startTimer();
  mountNav();
  goTo(0);
  renderTimer();
});

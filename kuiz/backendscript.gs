const SPREADSHEET_ID = "1GVq8zQ0-Ln38mjdZc5snaxT6p09NMEePxMXFJFyB8DU";
const DaftarTes = "Sheet1";
const DetailSoal = "Sheet2";
// fungsi get untuk mengambil data
/*
 */

function doGet(e) {
  /*
  fungsi ini bertujuan untuk mengambil data dengan struktur sebagai berikut
  {
  "testID": "001A",
  "testTitle": "Artimatika dan Aljabar",
  "testDuration": 60,
  "password": "PASS_KUIS_1",
  "questions": [
    { "noSoal": 1, "question": "1 + 1 = ...", "opsi": "1,2,3,4" },
    { "noSoal": 2, "question": "2 x 3 = ...", "opsi": "4,5,6,7" }
  ]
}
  */
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const targetID = e.parameter.id;

  // SCENARIO A: Jika ada parameter ID, kembalikan METADATA + DETAIL SOAL
  if (targetID) {
    // 1. Ambil data informasi kuis dari Sheet 'DaftarTes'
    const sheetTes = ss.getSheetByName(DaftarTes);
    const dataTes = sheetTes.getDataRange().getValues();
    const headersTes = dataTes[0];
    const rowsTes = dataTes.slice(1);

    // Cari baris kuis yang cocok dengan targetID
    let infoKuis = {};
    const barisTesTerpilih = rowsTes.find(
      (row) => row[0].toString() == targetID.toString(),
    );

    if (barisTesTerpilih) {
      headersTes.forEach((header, index) => {
        infoKuis[header] = barisTesTerpilih[index];
      });
    } else {
      return ContentService.createTextOutput(
        JSON.stringify({ error: "Kuis tidak ditemukan" }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Ambil data soal dari Sheet 'DetailSoal'
    const sheetSoal = ss.getSheetByName(DetailSoal);
    const dataSoal = sheetSoal.getDataRange().getValues();
    const headersSoal = dataSoal[0];
    const rowsSoal = dataSoal.slice(1);

    // Filter soal yang cocok dengan targetID
    const listSoal = rowsSoal
      .filter((row) => row[0].toString() == targetID.toString())
      .map((row) => {
        let obj = {};
        headersSoal.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      });

    // 3. Bungkus menjadi satu objek utuh sesuai keinginan Anda
    const paketKuisUtuh = {
      testID: infoKuis.testID,
      testTitle: infoKuis.testTitle,
      testGroup: infoKuis.testGroup,
      testDuration: infoKuis.testDuration,
      testPassword: infoKuis.testPassword, // Jika Anda membuat kolom password di sheet DaftarTes
      questions: listSoal, // Array berisi soal-soal kuis
    };

    return ContentService.createTextOutput(
      JSON.stringify(paketKuisUtuh),
    ).setMimeType(ContentService.MimeType.JSON);
  }

  // SCENARIO B: (Tetap sama) Jika TIDAK ADA parameter ID, berikan DAFTAR TES untuk dropdown
  else {
    const sheetTes = ss.getSheetByName(DaftarTes);
    const dataTes = sheetTes.getDataRange().getValues();
    const headers = dataTes[0];
    const rows = dataTes.slice(1);

    const listTes = rows.map((row) => {
      let obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });

    return ContentService.createTextOutput(JSON.stringify(listTes)).setMimeType(
      ContentService.MimeType.JSON,
    );
  }
}
// 2. Fungsi untuk MENAMBAH/MEMPERBARUI Data (POST)
function doPost(e) {
  try {
    const sheet =
      SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    const body = JSON.parse(e.postData.contents);

    // Contoh menambah baris baru (Create)
    // Sesuaikan dengan struktur data yang dikirim dari web
    sheet.appendRow([
      body.testID,
      body.testTittle,
      body.testGroup,
      body.testDuration,
      body.testPassword,
      body.testQuestion,
    ]);

    return ContentService.createTextOutput(
      JSON.stringify({ status: "success", message: "Data berhasil disimpan!" }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: error.toString() }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

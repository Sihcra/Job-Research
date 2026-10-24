/**
 * Trình xử lý logic giao diện CV (CV Screen)
 * Tuân thủ tài liệu đặc tả docs/ui-spec-cv.md
 */

// Dữ liệu đánh giá mẫu (Mock data) chính xác theo đặc tả
const SAMPLE_REVIEW = {
  ok: true,
  overall: 72,
  sections: [
    { name: "Tóm tắt", score: 65 },
    { name: "Kinh nghiệm", score: 80 },
    { name: "Kỹ năng", score: 70 },
    { name: "Học vấn", score: 90 },
    { name: "Ngoại ngữ", score: 60 }
  ],
  fixes: [
    { section: "Tóm tắt", line: null, text: "Thêm một kết quả có số liệu vào phần mở đầu." },
    { section: "Kinh nghiệm", line: "Xây dựng pipeline ETL", text: "Ghi rõ công nghệ đã dùng." },
    { section: "Ngoại ngữ", line: "Tiếng Anh", text: "Ghi điểm IELTS theo đúng mẫu chứng chỉ." }
  ]
};

// Dữ liệu đánh giá không có lỗi cần sửa
const NO_FIXES_REVIEW = {
  ok: true,
  overall: 92,
  sections: [
    { name: "Tóm tắt", score: 90 },
    { name: "Kinh nghiệm", score: 95 },
    { name: "Kỹ năng", score: 88 },
    { name: "Học vấn", score: 92 },
    { name: "Ngoại ngữ", score: 95 }
  ],
  fixes: []
};

/**
 * Tạo một tập tin PDF mẫu hợp lệ chuẩn PDF-1.4 bằng Blob
 * Sử dụng để hiển thị bản xem trước và tải về khi chưa tích hợp máy chủ
 */
function createPlaceholderPdfBlob() {
  const streamContent = [
    "BT",
    "/F1 22 Tf",
    "50 780 Td",
    "(CV - NGUYEN VAN A) Tj",
    "0 -36 Td",
    "/F1 14 Tf",
    "(Vi tri: Data Engineer) Tj",
    "0 -30 Td",
    "/F1 11 Tf",
    "(Lien he: a@example.com - Ha Noi) Tj",
    "0 -40 Td",
    "/F1 12 Tf",
    "(Tom tat: Ky su du lieu voi 3 nam kinh nghiem xay dung pipeline ETL.) Tj",
    "0 -32 Td",
    "/F1 12 Tf",
    "(Ky nang: Python, SQL, ETL Pipeline, Data Warehousing.) Tj",
    "0 -32 Td",
    "/F1 12 Tf",
    "(Hoc van: Cu nhan Khoa hoc May tinh - 2022) Tj",
    "0 -32 Td",
    "/F1 12 Tf",
    "(Ngoai ngu: Tieng Anh IELTS 7.0) Tj",
    "0 -50 Td",
    "/F1 10 Tf",
    "(Ban xem truoc CV mau tao tu ho so - He thong AI Job Search) Tj",
    "ET"
  ].join("\n");

  const streamLength = streamContent.length;
  const header = "%PDF-1.4\n";
  const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  const obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
  const obj3 = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n";
  const obj4 = `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`;
  const obj5 = "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";

  const offset0 = 0;
  const offset1 = header.length;
  const offset2 = offset1 + obj1.length;
  const offset3 = offset2 + obj2.length;
  const offset4 = offset3 + obj3.length;
  const offset5 = offset4 + obj4.length;
  const startxref = offset5 + obj5.length;

  const pad = (n) => String(n).padStart(10, "0");
  const xref = [
    "xref",
    "0 6",
    "0000000000 65535 f ",
    `${pad(offset1)} 00000 n `,
    `${pad(offset2)} 00000 n `,
    `${pad(offset3)} 00000 n `,
    `${pad(offset4)} 00000 n `,
    `${pad(offset5)} 00000 n `,
    "trailer",
    "<< /Size 6 /Root 1 0 R >>",
    "startxref",
    String(startxref),
    "%%EOF\n"
  ].join("\n");

  const pdfText = header + obj1 + obj2 + obj3 + obj4 + obj5 + xref;
  return new Blob([pdfText], { type: "application/pdf" });
}

/**
 * Lớp điều khiển API
 * Ở giai đoạn pilot: chạy bằng dữ liệu mẫu (mock data), không gửi lệnh gọi mạng.
 * Tích hợp máy chủ bằng cách cấu hình USE_MOCK = false.
 */
const API = {
  USE_MOCK: false,
  BASE_URL: "http://localhost:8000",

  async generateCv(simulationMode = "normal") {
    if (this.USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 600));
      if (simulationMode === "generate_error") {
        return { status: 500, data: { ok: false, error: "generate_failed" } };
      }
      if (simulationMode === "profile_missing") {
        return { status: 409, data: { ok: false, error: "profile_missing" } };
      }
      return { status: 200, data: { ok: true, generated_at: new Date().toISOString() } };
    }

    const response = await fetch(`${this.BASE_URL}/api/cv/generate`, {
      method: "POST"
    });
    const data = await response.json().catch(() => null);
    return { status: response.status, data };
  },

  async getPdf() {
    if (this.USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 200));
      return { status: 200, blob: createPlaceholderPdfBlob() };
    }

    const response = await fetch(`${this.BASE_URL}/api/cv/pdf`);
    if (response.status === 404) return { status: 404, blob: null };
    if (!response.ok) throw new Error("Load PDF failed");
    const blob = await response.blob();
    return { status: 200, blob };
  },

  async reviewCv(simulationMode = "normal") {
    if (this.USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 600));
      if (simulationMode === "review_error") {
        return { status: 500, data: { ok: false, error: "review_failed" } };
      }
      if (simulationMode === "no_cv") {
        return { status: 409, data: { ok: false, error: "no_cv" } };
      }
      if (simulationMode === "no_fixes") {
        return { status: 200, data: JSON.parse(JSON.stringify(NO_FIXES_REVIEW)) };
      }
      return { status: 200, data: JSON.parse(JSON.stringify(SAMPLE_REVIEW)) };
    }

    const response = await fetch(`${this.BASE_URL}/api/cv/review`, {
      method: "POST"
    });
    const data = await response.json().catch(() => null);
    return { status: response.status, data };
  }
};

// Trạng thái ứng dụng hiện tại
let currentState = "ready";
let currentPdfBlob = null;
let currentPdfUrl = null;
let currentGeneratedTime = "14:30";
let latestReviewData = null;
let toastTimer = null;

// Các phần tử DOM
const stateButtons = document.querySelectorAll(".btn-state");
const simulateDownloadErrorCheckbox = document.getElementById("simulate-download-error");

// Banners cảnh báo
const generateErrorBanner = document.getElementById("generate-error-banner");
const reviewErrorBanner = document.getElementById("review-error-banner");
const profileMissingBanner = document.getElementById("profile-missing-banner");
const retryGenerateBtn = document.getElementById("retry-generate-btn");
const retryReviewBtn = document.getElementById("retry-review-btn");

// Khối 1: Tạo CV
const generateBtn = document.getElementById("generate-btn");
const generateProgress = document.getElementById("generate-progress");
const generateStatus = document.getElementById("generate-status");

// Khối 2: Xem trước
const cvPdfFrame = document.getElementById("cv-pdf-frame");
const cvEmptyPlaceholder = document.getElementById("cv-empty-placeholder");
const downloadBtn = document.getElementById("download-btn");

// Khối 3: Đánh giá
const reviewBtn = document.getElementById("review-btn");
const reviewEmptyHint = document.getElementById("review-empty-hint");
const reviewProgress = document.getElementById("review-progress");
const reviewResult = document.getElementById("review-result");
const overallScoreValue = document.getElementById("overall-score-value");
const overallScoreTier = document.getElementById("overall-score-tier");
const sectionScoreRows = document.getElementById("section-score-rows");
const fixesList = document.getElementById("fixes-list");
const fixesEmpty = document.getElementById("fixes-empty");

// Toast
const toast = document.getElementById("toast");

/**
 * Hiển thị thông báo Toast
 */
function showToast(message, isError = false) {
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  toast.textContent = message;
  toast.className = isError ? "toast-notification toast-danger" : "toast-notification";
  toast.hidden = false;

  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 3000);
}

/**
 * Tính nhãn phân loại điểm
 * 0–59: Cần cải thiện
 * 60–79: Khá
 * 80–100: Tốt
 */
function getScoreTier(score) {
  if (score >= 80) return "Tốt";
  if (score >= 60) return "Khá";
  return "Cần cải thiện";
}

/**
 * Lấy class tương ứng với mức điểm
 */
function getTierClass(score) {
  if (score >= 80) return "tier-good";
  if (score >= 60) return "tier-fair";
  return "tier-improve";
}

/**
 * Định dạng thời gian HH:MM theo giờ Việt Nam
 */
function formatTimeHHMM(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Hiển thị kết quả đánh giá lên giao diện
 */
function renderReview(reviewData) {
  if (!reviewData) {
    reviewResult.hidden = true;
    return;
  }

  latestReviewData = reviewData;
  reviewResult.hidden = false;

  // 1. Điểm tổng thể
  const score = reviewData.overall;
  const tier = getScoreTier(score);
  const tierClass = getTierClass(score);

  overallScoreValue.textContent = score;
  overallScoreTier.textContent = tier;
  overallScoreTier.className = `cv-tier-badge ${tierClass}`;

  // 2. Điểm theo từng phần
  sectionScoreRows.innerHTML = "";
  if (Array.isArray(reviewData.sections)) {
    reviewData.sections.forEach(sec => {
      const row = document.createElement("div");
      row.className = "cv-score-row";

      const nameSpan = document.createElement("span");
      nameSpan.className = "cv-score-name";
      nameSpan.textContent = sec.name;

      const track = document.createElement("div");
      track.className = "cv-score-track";

      const fill = document.createElement("div");
      fill.className = `cv-score-fill ${getTierClass(sec.score)}`;
      fill.style.width = `${Math.min(100, Math.max(0, sec.score))}%`;
      track.appendChild(fill);

      const numSpan = document.createElement("span");
      numSpan.className = "cv-score-number";
      numSpan.textContent = sec.score;

      row.appendChild(nameSpan);
      row.appendChild(track);
      row.appendChild(numSpan);
      sectionScoreRows.appendChild(row);
    });
  }

  // 3. Danh sách điểm cần sửa (tối đa 5 mục)
  fixesList.innerHTML = "";
  const fixes = Array.isArray(reviewData.fixes) ? reviewData.fixes.slice(0, 5) : [];

  if (fixes.length === 0) {
    fixesList.hidden = true;
    fixesEmpty.hidden = false;
  } else {
    fixesList.hidden = false;
    fixesEmpty.hidden = true;

    fixes.forEach(fix => {
      const li = document.createElement("li");
      li.className = "cv-fix-item";

      const meta = document.createElement("div");
      meta.className = "cv-fix-meta";

      const badge = document.createElement("span");
      badge.className = "cv-fix-badge";
      badge.textContent = fix.section;
      meta.appendChild(badge);

      if (fix.line) {
        const line = document.createElement("span");
        line.className = "cv-fix-line";
        line.textContent = `Dòng liên quan: "${fix.line}"`;
        meta.appendChild(line);
      }

      const text = document.createElement("p");
      text.className = "cv-fix-text";
      text.textContent = fix.text;

      li.appendChild(meta);
      li.appendChild(text);
      fixesList.appendChild(li);
    });
  }
}

/**
 * Cập nhật luồng PDF trong khung xem trước
 */
function setPdfSource(blob) {
  if (currentPdfUrl) {
    URL.revokeObjectURL(currentPdfUrl);
    currentPdfUrl = null;
  }

  if (blob) {
    currentPdfBlob = blob;
    currentPdfUrl = URL.createObjectURL(blob);
    cvPdfFrame.src = currentPdfUrl;
    cvPdfFrame.hidden = false;
    cvEmptyPlaceholder.hidden = true;
  } else {
    currentPdfBlob = null;
    cvPdfFrame.src = "about:blank";
    cvPdfFrame.hidden = true;
    cvEmptyPlaceholder.hidden = false;
  }
}

/**
 * Áp dụng trạng thái cho giao diện
 */
function applyState(stateName) {
  currentState = stateName;

  // Cập nhật nút chọn trạng thái kiểm thử
  stateButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.state === stateName);
  });

  // Đặt lại các thông báo lỗi trừ khi trạng thái là lỗi
  if (stateName !== "generate_error") generateErrorBanner.hidden = true;
  if (stateName !== "review_error") reviewErrorBanner.hidden = true;
  if (stateName !== "profile_missing") profileMissingBanner.hidden = true;

  switch (stateName) {
    case "empty":
      // Trạng thái chưa có CV
      generateBtn.disabled = false;
      generateBtn.textContent = "Tạo CV từ hồ sơ";
      generateProgress.hidden = true;
      generateStatus.textContent = "";

      setPdfSource(null);
      downloadBtn.disabled = true;

      reviewBtn.disabled = true;
      reviewBtn.textContent = "Đánh giá CV";
      reviewEmptyHint.hidden = false;
      reviewProgress.hidden = true;
      reviewResult.hidden = true;
      break;

    case "generating":
      // Trạng thái đang tạo CV
      generateBtn.disabled = true;
      generateBtn.textContent = "Đang tạo…";
      generateProgress.hidden = false;

      // Giữ nguyên PDF cũ nếu có
      downloadBtn.disabled = true;

      reviewBtn.disabled = true;
      reviewProgress.hidden = true;
      break;

    case "ready":
      // Trạng thái đã tạo CV thành công
      generateBtn.disabled = false;
      generateBtn.textContent = "Tạo CV từ hồ sơ";
      generateProgress.hidden = true;
      generateStatus.textContent = `Đã tạo CV lúc ${currentGeneratedTime || formatTimeHHMM()}`;

      if (!currentPdfBlob) {
        setPdfSource(createPlaceholderPdfBlob());
      }
      downloadBtn.disabled = false;

      reviewBtn.disabled = false;
      reviewBtn.textContent = "Đánh giá CV";
      reviewEmptyHint.hidden = true;
      reviewProgress.hidden = true;

      // Hiển thị kết quả đánh giá mẫu nếu chưa có
      if (!latestReviewData) {
        renderReview(SAMPLE_REVIEW);
      } else {
        renderReview(latestReviewData);
      }
      break;

    case "reviewing":
      // Trạng thái đang đánh giá CV
      generateBtn.disabled = true;
      generateProgress.hidden = true;

      reviewBtn.disabled = true;
      reviewBtn.textContent = "Đang đánh giá…";
      reviewProgress.hidden = false;
      reviewEmptyHint.hidden = true;

      // Giữ kết quả đánh giá cũ hiển thị cho đến khi có kết quả mới
      if (latestReviewData) {
        renderReview(latestReviewData);
      }
      break;

    case "generate_error":
      // Lỗi khi tạo CV
      generateErrorBanner.hidden = false;
      generateBtn.disabled = false;
      generateBtn.textContent = "Tạo CV từ hồ sơ";
      generateProgress.hidden = true;
      break;

    case "review_error":
      // Lỗi khi đánh giá CV
      reviewErrorBanner.hidden = false;
      reviewBtn.disabled = false;
      reviewBtn.textContent = "Đánh giá CV";
      reviewProgress.hidden = true;
      break;

    case "profile_missing":
      // Lỗi 409: Hồ sơ chưa có thông tin
      profileMissingBanner.hidden = false;
      generateBtn.disabled = false;
      generateBtn.textContent = "Tạo CV từ hồ sơ";
      generateProgress.hidden = true;
      break;

    case "no_fixes":
      // Trường hợp đánh giá không có điểm cần sửa
      generateBtn.disabled = false;
      generateBtn.textContent = "Tạo CV từ hồ sơ";
      generateProgress.hidden = true;
      generateStatus.textContent = `Đã tạo CV lúc ${currentGeneratedTime || formatTimeHHMM()}`;

      if (!currentPdfBlob) {
        setPdfSource(createPlaceholderPdfBlob());
      }
      downloadBtn.disabled = false;

      reviewBtn.disabled = false;
      reviewBtn.textContent = "Đánh giá CV";
      reviewEmptyHint.hidden = true;
      reviewProgress.hidden = true;

      renderReview(NO_FIXES_REVIEW);
      break;
  }
}

/**
 * Xử lý hành động: Tạo CV từ hồ sơ
 */
async function handleGenerate(simulationMode = "normal") {
  generateErrorBanner.hidden = true;
  profileMissingBanner.hidden = true;

  generateBtn.disabled = true;
  generateBtn.textContent = "Đang tạo…";
  generateProgress.hidden = false;
  reviewBtn.disabled = true;
  downloadBtn.disabled = true;

  try {
    const res = await API.generateCv(simulationMode);

    if (res.status === 200) {
      currentGeneratedTime = formatTimeHHMM(new Date());
      const pdfRes = await API.getPdf();
      if (pdfRes.status === 200 && pdfRes.blob) {
        setPdfSource(pdfRes.blob);
      }
      applyState("ready");
    } else if (res.status === 409) {
      applyState("profile_missing");
    } else {
      applyState("generate_error");
    }
  } catch (err) {
    applyState("generate_error");
  }
}

/**
 * Xử lý hành động: Tải PDF
 */
function handleDownload() {
  const shouldSimulateError = simulateDownloadErrorCheckbox && simulateDownloadErrorCheckbox.checked;

  if (shouldSimulateError || !currentPdfBlob) {
    showToast("Không tải được PDF. Thử lại.", true);
    return;
  }

  try {
    const url = URL.createObjectURL(currentPdfBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cv.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    showToast("Không tải được PDF. Thử lại.", true);
  }
}

/**
 * Xử lý hành động: Đánh giá CV
 */
async function handleReview(simulationMode = "normal") {
  reviewErrorBanner.hidden = true;

  reviewBtn.disabled = true;
  reviewBtn.textContent = "Đang đánh giá…";
  reviewProgress.hidden = false;
  generateBtn.disabled = true;

  try {
    const res = await API.reviewCv(simulationMode);

    if (res.status === 200 && res.data && res.data.ok) {
      renderReview(res.data);
      reviewBtn.disabled = false;
      reviewBtn.textContent = "Đánh giá CV";
      reviewProgress.hidden = true;
      generateBtn.disabled = false;
      currentState = "ready";
    } else if (res.status === 409) {
      applyState("empty");
    } else {
      applyState("review_error");
    }
  } catch (err) {
    applyState("review_error");
  }
}

/**
 * Khởi tạo sự kiện giao diện
 */
function initEvents() {
  // Nút hành động chính
  generateBtn.addEventListener("click", () => handleGenerate("normal"));
  downloadBtn.addEventListener("click", handleDownload);
  reviewBtn.addEventListener("click", () => handleReview("normal"));

  // Nút thử lại trong biểu ngữ lỗi
  retryGenerateBtn.addEventListener("click", () => handleGenerate("normal"));
  retryReviewBtn.addEventListener("click", () => handleReview("normal"));

  // Bộ điều khiển trạng thái kiểm thử
  stateButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetState = btn.dataset.state;
      if (targetState === "generating") {
        handleGenerate("normal");
      } else if (targetState === "reviewing") {
        handleReview("normal");
      } else if (targetState === "generate_error") {
        handleGenerate("generate_error");
      } else if (targetState === "review_error") {
        handleReview("review_error");
      } else if (targetState === "profile_missing") {
        handleGenerate("profile_missing");
      } else if (targetState === "no_fixes") {
        handleReview("no_fixes");
      } else {
        applyState(targetState);
      }
    });
  });
}

// Khởi tạo trang ban đầu ở trạng thái Sẵn sàng (Ready) với dữ liệu mẫu
document.addEventListener("DOMContentLoaded", () => {
  initEvents();
  applyState("ready");
});

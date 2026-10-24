/**
 * Trình xử lý logic giao diện Hồ sơ (Profile Screen)
 * Tuân thủ tài liệu đặc tả docs/ui-spec.md
 */

// Dữ liệu mẫu (Mock data) chính xác theo đặc tả
const SAMPLE_PROFILE = {
  personal: {
    full_name: "Nguyễn Văn A",
    city: "Hà Nội",
    email: "a@example.com",
    phone: "",
    linkedin: "",
    summary: "Kỹ sư dữ liệu với 3 năm kinh nghiệm xây dựng pipeline."
  },
  experience: [
    {
      title: "Data Engineer",
      company: "Công ty mẫu",
      start: "2023-03",
      end: null,
      bullets: ["Xây dựng pipeline ETL xử lý 2 triệu bản ghi mỗi ngày."]
    }
  ],
  skills: [
    { name: "Python", level: "advanced" },
    { name: "SQL", level: "working" }
  ],
  education: [
    { degree: "Cử nhân Khoa học Máy tính", school: "Trường mẫu", year: 2022 }
  ],
  languages: [
    { name: "Tiếng Anh", level: "IELTS 7.0" }
  ],
  goals: {
    target_roles: ["Data Engineer"],
    locations: ["Hà Nội", "Remote"],
    min_salary_vnd: 25000000,
    avoid: ["Telesales"]
  }
};

// Dữ liệu trống (Empty profile)
const EMPTY_PROFILE = {
  personal: {
    full_name: "",
    city: "",
    email: "",
    phone: "",
    linkedin: "",
    summary: ""
  },
  experience: [],
  skills: [],
  education: [],
  languages: [],
  goals: {
    target_roles: [],
    locations: [],
    min_salary_vnd: null,
    avoid: []
  }
};

/**
 * Lớp điều khiển API
 * Ở giai đoạn pilot: chạy hoàn toàn bằng dữ liệu mẫu (mock data), không gửi lệnh gọi mạng.
 * Thiết kế sẵn sàng để tích hợp máy chủ bằng cách cấu hình USE_MOCK = false.
 */
const API = {
  USE_MOCK: true,
  BASE_URL: "http://localhost:8000",

  async getProfile(mode = "sample") {
    if (this.USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 350));
      if (mode === "load_error") {
        throw new Error("Lỗi tải hồ sơ giả lập");
      }
      if (mode === "empty") {
        return { status: 404, data: null };
      }
      return { status: 200, data: JSON.parse(JSON.stringify(SAMPLE_PROFILE)) };
    }

    const response = await fetch(`${this.BASE_URL}/api/profile`);
    if (response.status === 404) return { status: 404, data: null };
    if (!response.ok) throw new Error("Load failed");
    return { status: 200, data: await response.json() };
  },

  async saveProfile(payload, simulateError = false) {
    if (this.USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 600));
      if (simulateError) {
        return { status: 500, data: { ok: false, message: "Internal server error" } };
      }
      return { status: 200, data: { ok: true, saved_at: new Date().toISOString() } };
    }

    const response = await fetch(`${this.BASE_URL}/api/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => null);
    return { status: response.status, data };
  }
};

// Trạng thái ứng dụng hiện tại
let currentMode = "sample";
let toastTimer = null;
const tagManagers = {};

// Các phần tử DOM chính
const form = document.getElementById("profile-form");
const saveBtn = document.getElementById("save-button");
const emptyHint = document.getElementById("empty-state-hint");
const loadErrorBanner = document.getElementById("load-error-banner");
const saveErrorBanner = document.getElementById("save-error-banner");
const retryLoadBtn = document.getElementById("retry-load-btn");
const dismissSaveErrorBtn = document.getElementById("dismiss-save-error-btn");
const skeletonLoader = document.getElementById("skeleton-loader");
const toast = document.getElementById("toast");
const simulateSaveErrorCheckbox = document.getElementById("simulate-save-error");

// Danh sách động
const experienceList = document.getElementById("experience-list");
const skillsList = document.getElementById("skills-list");
const educationList = document.getElementById("education-list");
const languagesList = document.getElementById("languages-list");

// Nút thêm danh sách
const addExperienceBtn = document.getElementById("add-experience-btn");
const addSkillBtn = document.getElementById("add-skill-btn");
const addEducationBtn = document.getElementById("add-education-btn");
const addLanguageBtn = document.getElementById("add-language-btn");

// Đếm ký tự phần Tóm tắt
const summaryTextarea = document.getElementById("personal-summary");
const summaryCounter = document.getElementById("summary-counter");

// Nút mô phỏng trạng thái
const stateButtons = document.querySelectorAll(".btn-state");

/**
 * Hiển thị thông báo Toast
 */
function showToast(message = "Đã lưu hồ sơ") {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 3000);
}

/**
 * Cập nhật số ký tự phần tóm tắt
 */
function updateSummaryCounter() {
  const length = summaryTextarea.value.length;
  summaryCounter.textContent = `${length} / 500`;
  if (length > 500) {
    summaryCounter.classList.add("limit-exceeded");
  } else {
    summaryCounter.classList.remove("limit-exceeded");
  }
}

summaryTextarea.addEventListener("input", updateSummaryCounter);

/**
 * Trình quản lý Thẻ nhập liệu (Tags Input)
 */
function initTagInput(wrapper) {
  const field = wrapper.dataset.field;
  const chipContainer = wrapper.querySelector(".tags-chip-list");
  const inputField = wrapper.querySelector(".tags-input-field");
  let tags = [];

  function renderTags() {
    chipContainer.innerHTML = "";
    tags.forEach((tag, index) => {
      const chip = document.createElement("span");
      chip.className = "tag-chip";
      
      const tagText = document.createElement("span");
      tagText.textContent = tag;
      chip.appendChild(tagText);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "tag-remove";
      removeBtn.setAttribute("aria-label", `Xóa ${tag}`);
      removeBtn.innerHTML = "&times;";
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeTag(index);
      });

      chip.appendChild(removeBtn);
      chipContainer.appendChild(chip);
    });
  }

  function addTag(text) {
    const trimmed = text.trim();
    if (trimmed && !tags.includes(trimmed)) {
      tags.push(trimmed);
      renderTags();
    }
    inputField.value = "";
  }

  function removeTag(index) {
    tags.splice(index, 1);
    renderTags();
  }

  wrapper.addEventListener("click", () => {
    inputField.focus();
  });

  inputField.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputField.value);
    } else if (e.key === "Backspace" && inputField.value === "" && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  });

  inputField.addEventListener("change", () => {
    if (inputField.value.trim()) {
      addTag(inputField.value);
    }
  });

  inputField.addEventListener("blur", () => {
    if (inputField.value.trim()) {
      addTag(inputField.value);
    }
  });

  const manager = {
    getTags() {
      return [...tags];
    },
    setTags(newTags) {
      tags = Array.isArray(newTags) ? [...newTags] : [];
      renderTags();
      inputField.value = "";
    },
    clear() {
      tags = [];
      renderTags();
      inputField.value = "";
    }
  };

  tagManagers[field] = manager;
  return manager;
}

// Khởi tạo các trường Tags
document.querySelectorAll(".tags-input-wrapper").forEach(wrapper => {
  initTagInput(wrapper);
});

/**
 * Xóa thông báo lỗi trường cụ thể
 */
function clearFieldError(element) {
  if (!element) return;
  element.classList.remove("input-invalid");
  const errorContainer = element.closest(".form-group")?.querySelector(".field-error")
    || element.closest(".list-card")?.querySelector(`.field-error[data-for="${element.dataset.fieldKey || element.name}"]`);
  if (errorContainer) {
    errorContainer.textContent = "";
  }
}

/**
 * Thiết lập lỗi cho trường cụ thể
 */
function setFieldError(element, message, errorContainer = null) {
  if (element) {
    element.classList.add("input-invalid");
  }
  if (!errorContainer && element) {
    errorContainer = element.closest(".form-group")?.querySelector(".field-error")
      || element.closest(".list-card")?.querySelector(`.field-error[data-for="${element.dataset.fieldKey || element.name}"]`);
  }
  if (errorContainer) {
    errorContainer.textContent = message;
  }
}

/**
 * Xóa tất cả các thông báo lỗi hiện có
 */
function clearAllErrors() {
  document.querySelectorAll(".input-invalid").forEach(el => el.classList.remove("input-invalid"));
  document.querySelectorAll(".field-error").forEach(el => el.textContent = "");
  saveErrorBanner.hidden = true;
}

/**
 * Thêm một mục Kinh nghiệm mới
 * Tuân thủ placeholders và help text theo docs/ui-spec.md
 */
function addExperienceItem(data = {}) {
  const card = document.createElement("div");
  card.className = "list-card";

  const bulletsText = Array.isArray(data.bullets) ? data.bullets.join("\n") : (data.bullets || "");

  card.innerHTML = `
    <div class="list-card-header">
      <button type="button" class="btn-danger btn-remove-item">Xóa</button>
    </div>
    <div class="list-card-body">
      <div class="form-grid-2">
        <div class="form-group">
          <label>Chức danh <span class="required-mark">*</span></label>
          <input type="text" name="exp_title" data-field-key="title" value="${escapeHtml(data.title || "")}" required placeholder="Ví dụ: Data Engineer" list="datalist-experience-title">
          <div class="field-hint">Chức danh bạn đã đảm nhận</div>
          <div class="field-error" data-for="title" role="alert"></div>
        </div>
        <div class="form-group">
          <label>Công ty <span class="required-mark">*</span></label>
          <input type="text" name="exp_company" data-field-key="company" value="${escapeHtml(data.company || "")}" required placeholder="Ví dụ: Công ty ABC">
          <div class="field-hint">Tên công ty</div>
          <div class="field-error" data-for="company" role="alert"></div>
        </div>
      </div>
      <div class="form-grid-2">
        <div class="form-group">
          <label>Tháng bắt đầu <span class="required-mark">*</span></label>
          <input type="month" name="exp_start" data-field-key="start" value="${escapeHtml(data.start || "")}" required placeholder="Chọn tháng bắt đầu">
          <div class="field-hint">Tháng và năm bắt đầu làm việc</div>
          <div class="field-error" data-for="start" role="alert"></div>
        </div>
        <div class="form-group">
          <label>Tháng kết thúc</label>
          <input type="month" name="exp_end" data-field-key="end" value="${escapeHtml(data.end || "")}" placeholder="Để trống nếu đang làm">
          <div class="field-hint">Bỏ trống nghĩa là hiện tại</div>
          <div class="field-error" data-for="end" role="alert"></div>
        </div>
      </div>
      <div class="form-group">
        <label>Thành tích / Mô tả công việc</label>
        <textarea name="exp_bullets" rows="3" placeholder="Mỗi dòng một thành tích">${escapeHtml(bulletsText)}</textarea>
        <div class="field-hint">Ghi có số liệu nếu được, ví dụ "giảm 20% thời gian xử lý"</div>
        <div class="field-error" data-for="bullets" role="alert"></div>
      </div>
    </div>
  `;

  card.querySelector(".btn-remove-item").addEventListener("click", () => {
    card.remove();
  });

  experienceList.appendChild(card);
}

/**
 * Thêm một mục Kỹ năng mới
 * Tuân thủ placeholders và help text theo docs/ui-spec.md
 */
function addSkillItem(data = {}) {
  const card = document.createElement("div");
  card.className = "list-card";

  const level = data.level || "";

  card.innerHTML = `
    <div class="list-card-header">
      <button type="button" class="btn-danger btn-remove-item">Xóa</button>
    </div>
    <div class="list-card-body">
      <div class="form-grid-2">
        <div class="form-group">
          <label>Tên kỹ năng <span class="required-mark">*</span></label>
          <input type="text" name="skill_name" data-field-key="name" placeholder="Ví dụ: Python" list="datalist-skills-name" value="${escapeHtml(data.name || "")}" required>
          <div class="field-hint">Công cụ hoặc kỹ năng cụ thể</div>
          <div class="field-error" data-for="name" role="alert"></div>
        </div>
        <div class="form-group">
          <label>Trình độ <span class="required-mark">*</span></label>
          <select name="skill_level" data-field-key="level" required>
            <option value="">-- Chọn trình độ --</option>
            <option value="beginner" ${level === "beginner" ? "selected" : ""}>Cơ bản (beginner)</option>
            <option value="working" ${level === "working" ? "selected" : ""}>Trung cấp (working)</option>
            <option value="advanced" ${level === "advanced" ? "selected" : ""}>Nâng cao (advanced)</option>
            <option value="expert" ${level === "expert" ? "selected" : ""}>Chuyên gia (expert)</option>
          </select>
          <div class="field-error" data-for="level" role="alert"></div>
        </div>
      </div>
    </div>
  `;

  card.querySelector(".btn-remove-item").addEventListener("click", () => {
    card.remove();
  });

  skillsList.appendChild(card);
}

/**
 * Thêm một mục Học vấn mới
 * Tuân thủ placeholders và help text theo docs/ui-spec.md
 */
function addEducationItem(data = {}) {
  const card = document.createElement("div");
  card.className = "list-card";

  card.innerHTML = `
    <div class="list-card-header">
      <button type="button" class="btn-danger btn-remove-item">Xóa</button>
    </div>
    <div class="list-card-body">
      <div class="form-grid-3">
        <div class="form-group">
          <label>Bằng cấp / Chuyên ngành <span class="required-mark">*</span></label>
          <input type="text" name="edu_degree" data-field-key="degree" placeholder="Ví dụ: Cử nhân Khoa học Máy tính" list="datalist-education-degree" value="${escapeHtml(data.degree || "")}" required>
          <div class="field-hint">Bằng cấp cao nhất</div>
          <div class="field-error" data-for="degree" role="alert"></div>
        </div>
        <div class="form-group">
          <label>Trường đào tạo <span class="required-mark">*</span></label>
          <input type="text" name="edu_school" data-field-key="school" placeholder="Ví dụ: Đại học Bách khoa Hà Nội" value="${escapeHtml(data.school || "")}" required>
          <div class="field-hint">Tên trường</div>
          <div class="field-error" data-for="school" role="alert"></div>
        </div>
        <div class="form-group">
          <label>Năm tốt nghiệp <span class="required-mark">*</span></label>
          <input type="number" name="edu_year" data-field-key="year" min="1950" max="2035" placeholder="Ví dụ: 2022" value="${data.year || ""}" required>
          <div class="field-hint">Năm tốt nghiệp</div>
          <div class="field-error" data-for="year" role="alert"></div>
        </div>
      </div>
    </div>
  `;

  card.querySelector(".btn-remove-item").addEventListener("click", () => {
    card.remove();
  });

  educationList.appendChild(card);
}

/**
 * Thêm một mục Ngoại ngữ mới
 * Tuân thủ placeholders và help text theo docs/ui-spec.md
 */
function addLanguageItem(data = {}) {
  const card = document.createElement("div");
  card.className = "list-card";

  card.innerHTML = `
    <div class="list-card-header">
      <button type="button" class="btn-danger btn-remove-item">Xóa</button>
    </div>
    <div class="list-card-body">
      <div class="form-grid-2">
        <div class="form-group">
          <label>Tên ngoại ngữ <span class="required-mark">*</span></label>
          <input type="text" name="lang_name" data-field-key="name" placeholder="Ví dụ: Tiếng Anh" list="datalist-languages-name" value="${escapeHtml(data.name || "")}" required>
          <div class="field-hint">Ngôn ngữ bạn dùng được</div>
          <div class="field-error" data-for="name" role="alert"></div>
        </div>
        <div class="form-group">
          <label>Trình độ <span class="required-mark">*</span></label>
          <input type="text" name="lang_level" data-field-key="level" placeholder="Ví dụ: IELTS 7.0" list="datalist-languages-level" value="${escapeHtml(data.level || "")}" required>
          <div class="field-hint">Chứng chỉ hoặc mức tự đánh giá</div>
          <div class="field-error" data-for="level" role="alert"></div>
        </div>
      </div>
    </div>
  `;

  card.querySelector(".btn-remove-item").addEventListener("click", () => {
    card.remove();
  });

  languagesList.appendChild(card);
}

// Gắn sự kiện thêm dòng cho các danh sách
addExperienceBtn.addEventListener("click", () => addExperienceItem());
addSkillBtn.addEventListener("click", () => addSkillItem());
addEducationBtn.addEventListener("click", () => addEducationItem());
addLanguageBtn.addEventListener("click", () => addLanguageItem());

/**
 * Điền toàn bộ dữ liệu vào biểu mẫu
 */
function populateForm(profile) {
  clearAllErrors();

  const p = profile.personal || {};
  document.getElementById("personal-full-name").value = p.full_name || "";
  document.getElementById("personal-city").value = p.city || "";
  document.getElementById("personal-email").value = p.email || "";
  document.getElementById("personal-phone").value = p.phone || "";
  document.getElementById("personal-linkedin").value = p.linkedin || "";
  document.getElementById("personal-summary").value = p.summary || "";
  updateSummaryCounter();

  // Xóa danh sách cũ
  experienceList.innerHTML = "";
  skillsList.innerHTML = "";
  educationList.innerHTML = "";
  languagesList.innerHTML = "";

  // Điền danh sách
  (profile.experience || []).forEach(item => addExperienceItem(item));
  (profile.skills || []).forEach(item => addSkillItem(item));
  (profile.education || []).forEach(item => addEducationItem(item));
  (profile.languages || []).forEach(item => addLanguageItem(item));

  // Điền mục tiêu
  const g = profile.goals || {};
  tagManagers.target_roles?.setTags(g.target_roles || []);
  tagManagers.locations?.setTags(g.locations || []);
  tagManagers.avoid?.setTags(g.avoid || []);

  const salaryInput = document.getElementById("goals-min-salary");
  salaryInput.value = (g.min_salary_vnd !== undefined && g.min_salary_vnd !== null) ? g.min_salary_vnd : "";
}

/**
 * Thu thập dữ liệu từ biểu mẫu thành cấu trúc JSON đúng chuẩn
 */
function collectFormData() {
  const bulletsToArray = (text) => {
    return text.split("\n").map(line => line.trim()).filter(line => line.length > 0);
  };

  const experience = [];
  experienceList.querySelectorAll(".list-card").forEach(card => {
    experience.push({
      title: card.querySelector('input[name="exp_title"]').value.trim(),
      company: card.querySelector('input[name="exp_company"]').value.trim(),
      start: card.querySelector('input[name="exp_start"]').value.trim(),
      end: card.querySelector('input[name="exp_end"]').value.trim() || null,
      bullets: bulletsToArray(card.querySelector('textarea[name="exp_bullets"]').value)
    });
  });

  const skills = [];
  skillsList.querySelectorAll(".list-card").forEach(card => {
    skills.push({
      name: card.querySelector('input[name="skill_name"]').value.trim(),
      level: card.querySelector('select[name="skill_level"]').value.trim()
    });
  });

  const education = [];
  educationList.querySelectorAll(".list-card").forEach(card => {
    const yearVal = card.querySelector('input[name="edu_year"]').value.trim();
    education.push({
      degree: card.querySelector('input[name="edu_degree"]').value.trim(),
      school: card.querySelector('input[name="edu_school"]').value.trim(),
      year: yearVal ? parseInt(yearVal, 10) : null
    });
  });

  const languages = [];
  languagesList.querySelectorAll(".list-card").forEach(card => {
    languages.push({
      name: card.querySelector('input[name="lang_name"]').value.trim(),
      level: card.querySelector('input[name="lang_level"]').value.trim()
    });
  });

  const salaryVal = document.getElementById("goals-min-salary").value.trim();

  return {
    personal: {
      full_name: document.getElementById("personal-full-name").value.trim(),
      city: document.getElementById("personal-city").value.trim(),
      email: document.getElementById("personal-email").value.trim(),
      phone: document.getElementById("personal-phone").value.trim(),
      linkedin: document.getElementById("personal-linkedin").value.trim(),
      summary: document.getElementById("personal-summary").value.trim()
    },
    experience,
    skills,
    education,
    languages,
    goals: {
      target_roles: tagManagers.target_roles?.getTags() || [],
      locations: tagManagers.locations?.getTags() || [],
      min_salary_vnd: salaryVal === "" ? null : Number(salaryVal),
      avoid: tagManagers.avoid?.getTags() || []
    }
  };
}

/**
 * Kiểm tra tính hợp lệ của dữ liệu (Validation)
 */
function validateProfile(data) {
  const errors = [];

  // 1. Kiểm tra Thông tin cá nhân
  const fullNameEl = document.getElementById("personal-full-name");
  if (!data.personal.full_name) {
    errors.push({ element: fullNameEl, message: "Vui lòng nhập họ và tên." });
  }

  const cityEl = document.getElementById("personal-city");
  if (!data.personal.city) {
    errors.push({ element: cityEl, message: "Vui lòng nhập thành phố." });
  }

  const emailEl = document.getElementById("personal-email");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.personal.email) {
    errors.push({ element: emailEl, message: "Vui lòng nhập email." });
  } else if (!emailRegex.test(data.personal.email)) {
    errors.push({ element: emailEl, message: "Email không đúng định dạng." });
  }

  const linkedinEl = document.getElementById("personal-linkedin");
  if (data.personal.linkedin) {
    try {
      const url = new URL(data.personal.linkedin);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        errors.push({ element: linkedinEl, message: "URL LinkedIn phải bắt đầu bằng http:// hoặc https://." });
      }
    } catch {
      errors.push({ element: linkedinEl, message: "URL LinkedIn không hợp lệ." });
    }
  }

  const summaryEl = document.getElementById("personal-summary");
  if (data.personal.summary && data.personal.summary.length > 500) {
    errors.push({ element: summaryEl, message: "Tóm tắt không được vượt quá 500 ký tự." });
  }

  // 2. Kiểm tra Kinh nghiệm
  const expCards = experienceList.querySelectorAll(".list-card");
  data.experience.forEach((exp, i) => {
    const card = expCards[i];
    if (!card) return;

    const titleEl = card.querySelector('input[name="exp_title"]');
    if (!exp.title) {
      errors.push({ element: titleEl, message: "Vui lòng nhập chức danh." });
    }

    const companyEl = card.querySelector('input[name="exp_company"]');
    if (!exp.company) {
      errors.push({ element: companyEl, message: "Vui lòng nhập tên công ty." });
    }

    const startEl = card.querySelector('input[name="exp_start"]');
    if (!exp.start) {
      errors.push({ element: startEl, message: "Vui lòng chọn tháng bắt đầu." });
    }

    const endEl = card.querySelector('input[name="exp_end"]');
    if (exp.start && exp.end && exp.end < exp.start) {
      errors.push({ element: endEl, message: "Tháng kết thúc phải sau tháng bắt đầu." });
    }
  });

  // 3. Kiểm tra Kỹ năng
  const skillCards = skillsList.querySelectorAll(".list-card");
  data.skills.forEach((skill, i) => {
    const card = skillCards[i];
    if (!card) return;

    const nameEl = card.querySelector('input[name="skill_name"]');
    if (!skill.name) {
      errors.push({ element: nameEl, message: "Vui lòng nhập tên kỹ năng." });
    }

    const levelEl = card.querySelector('select[name="skill_level"]');
    if (!skill.level) {
      errors.push({ element: levelEl, message: "Vui lòng chọn trình độ." });
    }
  });

  // 4. Kiểm tra Học vấn
  const eduCards = educationList.querySelectorAll(".list-card");
  data.education.forEach((edu, i) => {
    const card = eduCards[i];
    if (!card) return;

    const degreeEl = card.querySelector('input[name="edu_degree"]');
    if (!edu.degree) {
      errors.push({ element: degreeEl, message: "Vui lòng nhập bằng cấp." });
    }

    const schoolEl = card.querySelector('input[name="edu_school"]');
    if (!edu.school) {
      errors.push({ element: schoolEl, message: "Vui lòng nhập tên trường." });
    }

    const yearEl = card.querySelector('input[name="edu_year"]');
    if (!edu.year || isNaN(edu.year) || edu.year < 1950 || edu.year > 2035) {
      errors.push({ element: yearEl, message: "Năm tốt nghiệp phải từ 1950 đến 2035." });
    }
  });

  // 5. Kiểm tra Ngoại ngữ
  const langCards = languagesList.querySelectorAll(".list-card");
  data.languages.forEach((lang, i) => {
    const card = langCards[i];
    if (!card) return;

    const nameEl = card.querySelector('input[name="lang_name"]');
    if (!lang.name) {
      errors.push({ element: nameEl, message: "Vui lòng nhập tên ngoại ngữ." });
    }

    const levelEl = card.querySelector('input[name="lang_level"]');
    if (!lang.level) {
      errors.push({ element: levelEl, message: "Vui lòng nhập trình độ ngoại ngữ." });
    }
  });

  // 6. Kiểm tra Mục tiêu
  const salaryEl = document.getElementById("goals-min-salary");
  if (data.goals.min_salary_vnd !== null && (isNaN(data.goals.min_salary_vnd) || data.goals.min_salary_vnd < 0)) {
    errors.push({ element: salaryEl, message: "Mức lương không thể là số âm." });
  }

  return errors;
}

/**
 * Ánh xạ lỗi trả về từ máy chủ (Backend 400 format)
 */
function applyBackendErrors(backendErrors) {
  clearAllErrors();
  let firstInvalid = null;

  for (const [path, message] of Object.entries(backendErrors)) {
    const parts = path.split(".");
    let targetEl = null;

    if (parts[0] === "personal" && parts[1]) {
      targetEl = document.getElementById(`personal-${parts[1]}`);
    } else if (parts[0] === "experience" && parts[1] && parts[2]) {
      const idx = parseInt(parts[1], 10);
      const card = experienceList.querySelectorAll(".list-card")[idx];
      targetEl = card?.querySelector(`[data-field-key="${parts[2]}"]`);
    } else if (parts[0] === "skills" && parts[1] && parts[2]) {
      const idx = parseInt(parts[1], 10);
      const card = skillsList.querySelectorAll(".list-card")[idx];
      targetEl = card?.querySelector(`[data-field-key="${parts[2]}"]`);
    } else if (parts[0] === "education" && parts[1] && parts[2]) {
      const idx = parseInt(parts[1], 10);
      const card = educationList.querySelectorAll(".list-card")[idx];
      targetEl = card?.querySelector(`[data-field-key="${parts[2]}"]`);
    } else if (parts[0] === "languages" && parts[1] && parts[2]) {
      const idx = parseInt(parts[1], 10);
      const card = languagesList.querySelectorAll(".list-card")[idx];
      targetEl = card?.querySelector(`[data-field-key="${parts[2]}"]`);
    } else if (parts[0] === "goals" && parts[1]) {
      targetEl = document.getElementById(`goals-${parts[1]}`);
    }

    if (targetEl) {
      setFieldError(targetEl, message);
      if (!firstInvalid) firstInvalid = targetEl;
    }
  }

  if (firstInvalid) {
    firstInvalid.focus();
    firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

/**
 * Thiết lập trạng thái giao diện chính
 */
async function loadState(mode) {
  currentMode = mode;

  // Cập nhật nút điều khiển
  stateButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.state === mode);
  });

  clearAllErrors();
  loadErrorBanner.hidden = true;
  saveErrorBanner.hidden = true;

  if (mode === "loading") {
    skeletonLoader.hidden = false;
    form.hidden = true;
    emptyHint.hidden = true;
    saveBtn.disabled = true;
    return;
  }

  if (mode === "load_error") {
    skeletonLoader.hidden = true;
    form.hidden = true;
    emptyHint.hidden = true;
    loadErrorBanner.hidden = false;
    saveBtn.disabled = true;
    return;
  }

  // Chuyển sang trạng thái đang tải trong giây lát để người dùng thấy skeleton
  skeletonLoader.hidden = false;
  form.hidden = true;
  saveBtn.disabled = true;

  try {
    const result = await API.getProfile(mode);

    skeletonLoader.hidden = true;
    form.hidden = false;
    saveBtn.disabled = false;

    if (result.status === 404 || mode === "empty") {
      populateForm(EMPTY_PROFILE);
      emptyHint.hidden = false;
    } else {
      populateForm(result.data);
      emptyHint.hidden = true;
    }
  } catch {
    skeletonLoader.hidden = true;
    form.hidden = true;
    emptyHint.hidden = true;
    loadErrorBanner.hidden = false;
    saveBtn.disabled = true;
  }
}

/**
 * Xử lý sự kiện gửi Lưu hồ sơ
 */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAllErrors();

  const profileData = collectFormData();
  const validationErrors = validateProfile(profileData);

  if (validationErrors.length > 0) {
    validationErrors.forEach(({ element, message }) => {
      setFieldError(element, message);
    });

    const firstInvalid = validationErrors[0].element;
    if (firstInvalid) {
      firstInvalid.focus();
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return;
  }

  // Bước vào trạng thái Đang lưu (Saving)
  saveBtn.textContent = "Đang lưu…";
  saveBtn.disabled = true;

  const simulateError = simulateSaveErrorCheckbox.checked;

  try {
    const result = await API.saveProfile(profileData, simulateError);

    if (result.status === 200) {
      // Đã lưu thành công (Saved)
      emptyHint.hidden = true;
      showToast("Đã lưu hồ sơ");
    } else if (result.status === 400 && result.data?.errors) {
      applyBackendErrors(result.data.errors);
    } else {
      // Lỗi lưu hồ sơ (Save failed)
      saveErrorBanner.hidden = false;
    }
  } catch {
    // Lỗi mạng hoặc ngoại lệ
    saveErrorBanner.hidden = false;
  } finally {
    saveBtn.textContent = "Lưu hồ sơ";
    saveBtn.disabled = false;
  }
});

// Xóa lỗi trường khi người dùng nhập hoặc thay đổi giá trị
form.addEventListener("input", (e) => {
  clearFieldError(e.target);
});

form.addEventListener("change", (e) => {
  clearFieldError(e.target);
});

// Nút Thử lại khi tải thất bại
retryLoadBtn.addEventListener("click", () => {
  loadState("sample");
});

// Nút Đóng thông báo lỗi khi lưu thất bại
dismissSaveErrorBtn.addEventListener("click", () => {
  saveErrorBanner.hidden = true;
});

// Gắn sự kiện các nút chuyển trạng thái mô phỏng
stateButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    loadState(btn.dataset.state);
  });
});

/**
 * Tiện ích thoát chuỗi HTML an toàn
 */
function escapeHtml(string) {
  if (string === null || string === undefined) return "";
  return String(string)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Khởi tạo màn hình lần đầu với dữ liệu mẫu
loadState("sample");

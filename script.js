// ══════════════════════════════════════════
//  請將下方網址換成你的 Google Apps Script 部署網址
// ══════════════════════════════════════════
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyq_RNKI37m1pH1_BiwZy4Ta0EaGuzJ-Pxhu51i04KH1b-rdQP3T3BfoSS9gVev9w/exec';

// ── 檔案上傳顯示 ──
setupFileInput('insuranceFile', 'insurance-name', 'insurance-box');
setupFileInput('foodFile',      'food-name',      'food-box');

function setupFileInput(inputId, labelId, boxId) {
  const input  = document.getElementById(inputId);
  const nameEl = document.getElementById(labelId);
  const box    = document.getElementById(boxId);

  input?.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showFieldError(input, '檔案大小不能超過 10MB');
      input.value = '';
      box?.classList.remove('done');
      return;
    }
    nameEl.textContent = '✓ ' + file.name;
    box?.classList.add('done');
    box?.classList.remove('err');
    clearFieldError(input);
  });

  // 拖曳上傳
  box?.addEventListener('dragover', e => { e.preventDefault(); box.style.borderColor = 'var(--pink)'; });
  box?.addEventListener('dragleave', () => { box.style.borderColor = ''; });
  box?.addEventListener('drop', e => {
    e.preventDefault();
    box.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change'));
    }
  });
}

// ── DOM ──
const form      = document.getElementById('registration-form');
const submitBtn = document.getElementById('submit-btn');
const successEl = document.getElementById('success-msg');

// ── 將檔案轉為 base64 ──
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result); // 含 data:... 前綴
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── 表單送出 ──
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAllErrors();
  if (!validateForm()) return;

  // loading 狀態
  submitBtn.disabled = true;
  submitBtn.querySelector('.btn-text').hidden   = true;
  submitBtn.querySelector('.btn-loading').hidden = false;

  try {
    const insFile  = document.getElementById('insuranceFile').files[0];
    const foodFile = document.getElementById('foodFile').files[0];

    // 轉 base64（可能需要數秒）
    const [insB64, foodB64] = await Promise.all([
      insFile  ? fileToBase64(insFile)  : Promise.resolve(''),
      foodFile ? fileToBase64(foodFile) : Promise.resolve(''),
    ]);

    const payload = {
      fullName:         form.querySelector('[name="fullName"]').value.trim(),
      organization:     form.querySelector('[name="organization"]').value.trim(),
      phone:            form.querySelector('[name="phone"]').value.trim(),
      email:            form.querySelector('[name="email"]').value.trim(),
      vendorIdentity:   form.querySelector('[name="vendorIdentity"]').value,
      boothType:        form.querySelector('[name="boothType"]').value,
      productInfo:      form.querySelector('[name="productInfo"]').value.trim(),
      insurance:        form.querySelector('[name="insurance"]').value,
      foodRegistration: form.querySelector('[name="foodRegistration"]').value,
      motivation:       form.querySelector('[name="motivation"]').value.trim(),
      lineJoined:       form.querySelector('[name="lineJoined"]').value,
      insuranceFile:    insB64,
      insuranceName:    insFile?.name  || '',
      foodFile:         foodB64,
      foodName:         foodFile?.name || '',
    };

    const res = await fetch(GAS_URL, {
      method:  'POST',
      body:    JSON.stringify(payload),
    });

    // GAS 有時回 200 但 CORS 讀不到 body，只要不 throw 就當成功
    showSuccess();

  } catch (err) {
    alert('網路錯誤，請稍後重試或直接聯絡主辦方。\n\nLine：@743nyxjm');
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn-text').hidden   = false;
    submitBtn.querySelector('.btn-loading').hidden = true;
  }
});

function showSuccess() {
  form.style.display = 'none';
  if (successEl) {
    successEl.hidden = false;
    successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// ── 再填一份 ──
document.getElementById('reset-btn')?.addEventListener('click', () => {
  form.reset();
  form.style.display = '';
  if (successEl) successEl.hidden = true;
  submitBtn.disabled = false;
  submitBtn.querySelector('.btn-text').hidden   = false;
  submitBtn.querySelector('.btn-loading').hidden = true;
  document.getElementById('insurance-name').textContent = '點擊上傳（PDF / 圖片）';
  document.getElementById('food-name').textContent      = '點擊上傳（PDF / 圖片）';
  document.querySelectorAll('.file-box').forEach(b => b.classList.remove('done', 'err'));
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ── 驗證 ──
function validateForm() {
  let ok = true;
  form.querySelectorAll('[required]').forEach(field => {
    if (field.type === 'checkbox') {
      if (!field.checked) { ok = false; showCheckboxError('請勾選以同意條款'); }
    } else if (field.type === 'file') {
      if (!field.files?.length) {
        ok = false;
        showFieldError(field, '請上傳文件');
        document.getElementById(
          field.name === 'insuranceFile' ? 'insurance-box' : 'food-box'
        )?.classList.add('err');
      }
    } else {
      const v = field.value.trim();
      if (!v) {
        ok = false; showFieldError(field, '此欄位為必填');
      } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        ok = false; showFieldError(field, '請輸入有效的電子信箱');
      }
    }
  });
  if (!ok) {
    form.querySelector('.err input, .err select, .err textarea')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return ok;
}

function showFieldError(field, msg) {
  const wrap = field.closest('.field') || field.closest('.file-field');
  if (!wrap) return;
  wrap.classList.add('err');
  const e = wrap.querySelector('.emsg');
  if (e) e.textContent = msg;
}

function clearFieldError(field) {
  const wrap = field.closest('.field') || field.closest('.file-field');
  if (!wrap) return;
  wrap.classList.remove('err');
  const e = wrap.querySelector('.emsg');
  if (e) e.textContent = '';
}

function showCheckboxError(msg) {
  document.querySelector('.check-err').textContent = msg;
}

function clearAllErrors() {
  form.querySelectorAll('.err').forEach(el => el.classList.remove('err'));
  form.querySelectorAll('.emsg, .check-err').forEach(el => el.textContent = '');
  form.querySelectorAll('.file-box').forEach(b => b.classList.remove('err'));
}

// 電話只允許數字
document.querySelector('[name="phone"]')?.addEventListener('input', function () {
  this.value = this.value.replace(/[^\d]/g, '');
});

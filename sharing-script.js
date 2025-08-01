document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const popup = document.getElementById('popup');
  const closePopup = document.getElementById('closePopup');
  const formContainer = document.getElementById('form-container');
  const selectorButtons = document.querySelectorAll('.input-selector button');
  const textInputGroup = document.getElementById('textInputGroup');
  const audioInputGroup = document.getElementById('audioInputGroup');
  const imageInputGroup = document.getElementById('imageInputGroup');
  const videoInputGroup = document.getElementById('videoInputGroup');
  const form = document.getElementById('memoryForm');
  const loader = document.getElementById('loader');
  const statusMessage = document.getElementById('statusMessage');
  const recordButton = document.getElementById('recordButton');
  const stopButton = document.getElementById('stopButton');
  const audioPreview = document.getElementById('audioPreview');
  const audioDataInput = document.getElementById('audioData');
  const imageInput = document.getElementById('imageInput');
  const imagePreview = document.getElementById('imagePreview');
  const videoInput = document.getElementById('videoInput');
  const videoPreview = document.getElementById('videoPreview');
  const submitButton = document.getElementById('submitButton');

  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyoyx8EULFT2r67TwftTrSNXvzOVPXojaIE4Wxem8sACU16NGYNvpmhvCB1M6VHgETaJQ/exec';
  const API_KEY = '12345ABC';

  let mediaRecorder;
  let audioChunks = [];
  let clientIP = "";

  let base64Images = [];
  let base64Videos = [];

  // IP adresini al
  fetch("https://api64.ipify.org?format=json")
    .then(res => res.json())
    .then(data => {
      clientIP = data.ip;
    })
    .catch(() => {
      clientIP = "Bilinmiyor";
    });

  // Popup kapat, form göster
  closePopup.addEventListener('click', function() {
    popup.style.display = 'none';
    formContainer.style.display = 'block';
  });

  // Tür seçici butonlar
  selectorButtons.forEach(button => {
    button.addEventListener('click', function() {
      selectorButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');

      const type = this.dataset.type;
      textInputGroup.style.display = type === 'text' ? 'block' : 'none';
      audioInputGroup.style.display = type === 'audio' ? 'block' : 'none';
      imageInputGroup.style.display = type === 'image' ? 'block' : 'none';
      videoInputGroup.style.display = type === 'video' ? 'block' : 'none';

      hideStatus();
    });
  });

  // Çoklu resim seçimi ve önizleme
  imageInput.addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    base64Images = [];
    imagePreview.innerHTML = '';

    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = function(event) {
        const base64Data = event.target.result;
        base64Images.push(base64Data);

        const img = document.createElement('img');
        img.src = base64Data;
        img.style.maxWidth = '100px';
        img.style.maxHeight = '100px';
        img.style.borderRadius = '5px';
        img.style.objectFit = 'cover';
        img.style.boxShadow = '0 0 5px rgba(0,0,0,0.3)';
        imagePreview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });

  // Çoklu video seçimi ve önizleme
  videoInput.addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    base64Videos = [];
    videoPreview.innerHTML = '';

    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = function(event) {
        const base64Data = event.target.result;
        base64Videos.push(base64Data);

        const video = document.createElement('video');
        video.controls = true;
        video.style.maxWidth = '150px';
        video.style.maxHeight = '100px';
        video.style.borderRadius = '5px';

        const source = document.createElement('source');
        source.src = base64Data;
        source.type = file.type;
        video.appendChild(source);

        videoPreview.appendChild(video);
      };
      reader.readAsDataURL(file);
    });
  });

  // Ses kaydı başlatma
  recordButton.addEventListener('click', async function() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = function(e) {
        audioChunks.push(e.data);
      };

      mediaRecorder.onstop = function() {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPreview.src = audioUrl;
        audioPreview.style.display = 'block';

        const reader = new FileReader();
        reader.onloadend = function() {
          audioDataInput.value = reader.result;
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      recordButton.disabled = true;
      stopButton.style.display = 'inline-block';
      showStatus("Kayıt başladı...", "success");
    } catch (err) {
      showStatus("Mikrofon erişimi reddedildi: " + err.message, "error");
    }
  });

  // Ses kaydını durdurma
  stopButton.addEventListener('click', function() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      recordButton.disabled = false;
      stopButton.style.display = 'none';
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      showStatus("Kayıt tamamlandı", "success");
    }
  });

  // Form gönderimi
  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const activeType = document.querySelector('.input-selector .active').dataset.type;
    const name = document.getElementById('name').value.trim();
    const message = document.getElementById('message').value.trim();
    const audioData = audioDataInput.value;

    if (!name) {
      showStatus("Lütfen isminizi girin", "error");
      return;
    }

    if (activeType === 'text' && !message) {
      showStatus("Lütfen bir mesaj yazın", "error");
      return;
    }

    if (activeType === 'audio' && !audioData) {
      showStatus("Lütfen bir ses kaydı yapın", "error");
      return;
    }

    if (activeType === 'image' && base64Images.length === 0) {
      showStatus("Lütfen en az bir resim seçin", "error");
      return;
    }

    if (activeType === 'video' && base64Videos.length === 0) {
      showStatus("Lütfen en az bir video seçin", "error");
      return;
    }

    const formData = new FormData();
    formData.append('key', API_KEY);
    formData.append('name', name);
    formData.append('type', activeType);
    formData.append('ip', clientIP);

    if (activeType === 'text') {
      formData.append('message', message);
    } else if (activeType === 'audio') {
      formData.append('file', audioData);
    } else if (activeType === 'image') {
      formData.append('files', JSON.stringify(base64Images));
    } else if (activeType === 'video') {
      formData.append('files', JSON.stringify(base64Videos));
    }

    loader.style.display = 'block';
    submitButton.disabled = true;
    hideStatus();

    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();

      if (result.success) {
        showStatus(result.message || "Başarıyla gönderildi!", "success");
        form.reset();
        audioPreview.style.display = 'none';
        imagePreview.innerHTML = '';
        videoPreview.innerHTML = '';
        selectorButtons.forEach(btn => btn.classList.remove('active'));
        selectorButtons[0].classList.add('active');
        textInputGroup.style.display = 'block';
        audioInputGroup.style.display = 'none';
        imageInputGroup.style.display = 'none';
        videoInputGroup.style.display = 'none';

        base64Images = [];
        base64Videos = [];
        audioDataInput.value = "";
      } else {
        showStatus(result.message || "Gönderim başarısız oldu", "error");
      }
    } catch (error) {
      showStatus("Hata oluştu: " + error.message, "error");
      console.error('Error:', error);
    } finally {
      loader.style.display = 'none';
      submitButton.disabled = false;
    }
  });

  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = type;
    statusMessage.style.display = 'block';
    setTimeout(hideStatus, 5000);
  }

  function hideStatus() {
    statusMessage.style.display = 'none';
    statusMessage.textContent = '';
  }

});

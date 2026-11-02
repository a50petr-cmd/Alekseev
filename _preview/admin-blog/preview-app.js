(function () {
  const $ = (id) => document.getElementById(id);
  let coverDataUrl = '';
  const KEY = 'pa_blog_admin_preview_draft';

  const map = {
    а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'j',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'
  };

  function slugify(s) {
    s = (s || '').toLowerCase().trim();
    let out = '';
    for (const ch of s) {
      if (map[ch]) out += map[ch];
      else if (/[a-z0-9]/.test(ch)) out += ch;
      else out += '-';
    }
    return out.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'statya';
  }

  function firstParagraph(md) {
    const block = (md || '').replace(/\r\n/g, '\n').trim().split(/\n{2,}/)[0] || '';
    return block.replace(/^#+\s+/, '').replace(/\s+/g, ' ').trim();
  }

  $('cover').addEventListener('change', () => {
    const file = $('cover').files && $('cover').files[0];
    coverDataUrl = '';
    $('coverPreview').hidden = true;
    $('coverPreview').innerHTML = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      coverDataUrl = String(reader.result || '');
      $('coverPreview').hidden = false;
      $('coverPreview').innerHTML = '<img alt="" src="' + coverDataUrl.replace(/"/g, '&quot;') + '">';
    };
    reader.readAsDataURL(file);
  });

  function draft() {
    const title = $('title').value.trim();
    const bodyMd = $('body').value;
    return {
      title,
      slug: slugify(title),
      category: 'Практика',
      description: firstParagraph(bodyMd).slice(0, 160),
      date: new Date().toISOString().slice(0, 10),
      readTime: '5 минут',
      figure: '·',
      figureCaption: '',
      imageAlt: title,
      bodyMd,
      coverDataUrl
    };
  }

  function saveAndOpen() {
    const d = draft();
    if (!d.title || !d.bodyMd.trim()) {
      $('status').textContent = 'Нужны заголовок и текст';
      $('status').className = 'status bad';
      return null;
    }
    localStorage.setItem(KEY, JSON.stringify(d));
    const url = './preview.html';
    $('previewLink').innerHTML = 'Превью: <a href="' + url + '" target="_blank" rel="noopener">' + url + '</a>';
    $('status').textContent = 'Превью готово';
    $('status').className = 'status ok';
    return url;
  }

  $('btnPreview').addEventListener('click', () => {
    const url = saveAndOpen();
    if (url) window.open(url, '_blank');
  });

  const openTop = document.getElementById('openPreviewTop');
  if (openTop) {
    openTop.addEventListener('click', (e) => {
      e.preventDefault();
      const url = saveAndOpen();
      if (url) location.href = url;
    });
  }
})();

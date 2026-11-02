(function () {
  const $ = (id) => document.getElementById(id);
  const title = $('title');
  const cover = $('cover');
  const body = $('body');
  const status = $('status');
  const previewLink = $('previewLink');
  const coverPreview = $('coverPreview');
  const dynList = $('dynList');

  let coverDataUrl = '';

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

  function guessFigure(text) {
    const m = String(text || '').match(/([+\−-]?\d+(?:[.,]\d+)?%?)/);
    return m ? m[1].replace(',', '.') : '·';
  }

  cover.addEventListener('change', () => {
    const file = cover.files && cover.files[0];
    coverDataUrl = '';
    coverPreview.hidden = true;
    coverPreview.innerHTML = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      coverDataUrl = String(reader.result || '');
      coverPreview.hidden = false;
      coverPreview.innerHTML = '<img alt="" src="' + coverDataUrl.replace(/"/g, '&quot;') + '">';
    };
    reader.readAsDataURL(file);
  });

  function payload() {
    const t = title.value.trim();
    const md = body.value;
    const lead = firstParagraph(md);
    return {
      title: t,
      slug: slugify(t),
      category: 'Практика',
      description: lead.slice(0, 160),
      date: new Date().toISOString().slice(0, 10),
      readTime: '',
      figure: guessFigure(md),
      figureCaption: '',
      imageAlt: t,
      bodyMd: md,
      coverDataUrl: coverDataUrl
    };
  }

  function setStatus(msg, ok) {
    status.textContent = msg;
    status.className = 'status ' + (ok ? 'ok' : 'bad');
  }

  async function postForm(action, data, file) {
    const fd = new FormData();
    fd.append('action', action);
    fd.append('payload', JSON.stringify(data));
    if (file) fd.append('cover', file);
    const res = await fetch('/admin/api.php', { method: 'POST', body: fd, credentials: 'same-origin' });
    return res.json();
  }

  $('btnPreview').addEventListener('click', async () => {
    const data = payload();
    if (!data.title || !data.bodyMd.trim()) {
      setStatus('Нужны заголовок и текст', false);
      return;
    }
    setStatus('Готовлю превью…', true);
    try {
      const json = await postForm('preview_save', data);
      if (!json.ok) {
        setStatus('Не удалось сохранить черновик: ' + (json.error || ''), false);
        return;
      }
      previewLink.hidden = false;
      previewLink.innerHTML = 'Превью: <a href="' + json.url + '" target="_blank" rel="noopener">' + json.url + '</a>';
      setStatus('Превью готово', true);
      window.open(json.url, '_blank');
    } catch (e) {
      setStatus('Ошибка сети', false);
    }
  });

  $('btnPublish').addEventListener('click', async () => {
    const data = payload();
    if (!data.title || !data.bodyMd.trim()) {
      setStatus('Нужны заголовок и текст', false);
      return;
    }
    if (!confirm('Опубликовать статью на сайте?')) return;
    setStatus('Публикую…', true);
    try {
      const file = cover.files && cover.files[0] ? cover.files[0] : null;
      const json = await postForm('publish', data, file);
      if (!json.ok) {
        setStatus('Не опубликовано: ' + (json.message || json.error || 'ошибка'), false);
        return;
      }
      previewLink.hidden = false;
      previewLink.innerHTML = 'На сайте: <a href="' + json.url + '" target="_blank" rel="noopener">' + json.url + '</a>';
      setStatus('Опубликовано', true);
      loadList();
    } catch (e) {
      setStatus('Ошибка сети', false);
    }
  });

  async function loadList() {
    try {
      const res = await fetch('/admin/api.php?action=list', { credentials: 'same-origin' });
      const json = await res.json();
      if (!json.ok || !Array.isArray(json.posts) || json.posts.length === 0) {
        dynList.innerHTML = '<li class="muted">Пока пусто</li>';
        return;
      }
      dynList.innerHTML = json.posts.map((p) => {
        const href = '/blog/' + encodeURIComponent(p.slug) + '.html';
        return '<li><a href="' + href + '" target="_blank" rel="noopener">' + escapeHtml(p.title || p.slug) + '</a></li>';
      }).join('');
    } catch (e) {
      dynList.innerHTML = '<li class="muted">Список недоступен</li>';
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  loadList();
})();

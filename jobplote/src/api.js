
const BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api`;

const token = () => {
  try {
    return JSON.parse(
      localStorage.getItem('jp_auth') || 'null'
    )?.token;
  } catch {
    return null;
  }
};

const authHeader = () =>
  token()
    ? { Authorization: `Bearer ${token()}` }
    : {};

async function parse(res) {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(
      data.error || 'Something went wrong. Please try again.'
    );

    error.code = data.code;
    error.status = res.status;

    throw error;
  }

  return data;
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...authHeader(),
    },
    ...(body !== undefined
      ? { body: JSON.stringify(body) }
      : {}),
  });

  return parse(res);
}

// PDF upload using multipart/form-data
export async function upload(path, file) {
  const formData = new FormData();
  formData.append('resume', file);

  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: authHeader(),
    body: formData,
  });

  return parse(res);
}

// Open a protected PDF in a new browser tab
export async function openPdf(path) {
  const newWindow = window.open('', '_blank');

  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: authHeader(),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));

      throw new Error(
        data.error || 'Could not open the resume.'
      );
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    if (newWindow) {
      newWindow.location.href = url;
    } else {
      window.location.href = url;
    }

    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    newWindow?.close();
    throw error;
  }
}

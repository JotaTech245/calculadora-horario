const STORAGE_KEY = 'historicoHorasExtrasV3';
const PROFILE_STORAGE_KEY = 'calculadoraPerfilV1';
const LEGACY_STORAGE_KEYS = ['historicoHorasExtrasV2', 'historicoHorasExtras'];

const EMPTY_PROFILE = {
  name: '',
  role: '',
  avatarUrl: '',
  workHours: null,
  lunchMinutes: null,
  salary: null,
  monthlyDivisor: 220,
  overtimePercent: 50
};

const state = {
  selectedTab: 'saida',
  calendarDate: new Date(),
  selectedDate: null,
  history: {},
  profile: { ...EMPTY_PROFILE },
  supabaseClient: null,
  currentUser: null,
  remoteReady: false,
  syncMode: 'local'
};

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

async function initializeApp() {
  state.history = loadLocalHistory();
  state.profile = loadLocalProfile();

  bindNavigation();
  bindAuth();
  bindSaidaForm();
  bindExtrasForm();
  bindRegistroForm();
  bindProfileForm();
  await initSupabaseClient();

  renderCalendar();
  renderSelectedDate();
  renderMonthTotal();
  renderProfileForm();
  applyProfileDefaults({ silent: true });
  updateAuthUI();

  if (state.remoteReady) {
    await restoreSession();
  }
}

async function initSupabaseClient() {
  const config = await getSupabaseConfig();

  if (!config || !window.supabase) {
    state.syncMode = 'local';
    return;
  }

  state.supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  state.remoteReady = true;
  state.syncMode = 'cloud';

  state.supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    state.currentUser = session?.user || null;
    updateAuthUI();

    if (state.currentUser) {
      await hydrateRemoteHistory();
      await hydrateRemoteProfile();
    } else {
      state.history = loadLocalHistory();
      state.profile = loadLocalProfile();
      renderCalendar();
      renderSelectedDate();
      renderMonthTotal();
      renderProfileForm();
    }
  });
}

async function getSupabaseConfig() {
  const remoteConfig = await fetchVercelConfig();

  if (remoteConfig) {
    return remoteConfig;
  }

  const config = window.CALCULADORA_SUPABASE || {};
  const url = String(config.url || '').trim();
  const anonKey = String(config.anonKey || '').trim();

  return normalizeSupabaseConfig(url, anonKey);
}

async function fetchVercelConfig() {
  if (typeof fetch !== 'function') {
    return null;
  }

  try {
    const response = await fetch('/api/config', {
      cache: 'no-store'
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return normalizeSupabaseConfig(data.supabaseUrl, data.supabaseAnonKey);
  } catch {
    return null;
  }
}

function normalizeSupabaseConfig(urlValue, keyValue) {
  const url = String(urlValue || '').trim();
  const anonKey = String(keyValue || '').trim();

  if (!url || !anonKey || !url.includes('.supabase.co')) {
    return null;
  }

  return { url, anonKey };
}

async function restoreSession() {
  setSyncStatus('Verificando conta...');

  const { data, error } = await state.supabaseClient.auth.getSession();

  if (error) {
    setAuthMessage(error.message);
    setSyncStatus('Modo local');
    return;
  }

  state.currentUser = data.session?.user || null;
  updateAuthUI();

  if (state.currentUser) {
    await hydrateRemoteHistory();
    await hydrateRemoteProfile();
  } else {
    setSyncStatus('Login necessário');
  }
}

function bindAuth() {
  const authForm = document.getElementById('auth-form');
  const signupButton = document.getElementById('signupButton');
  const logoutButton = document.getElementById('logoutButton');

  authForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!state.remoteReady) {
      setAuthMessage('Configure o Supabase antes de entrar.');
      return;
    }

    await signIn();
  });

  signupButton.addEventListener('click', async () => {
    if (!state.remoteReady) {
      setAuthMessage('Configure o Supabase antes de criar uma conta.');
      return;
    }

    await signUp();
  });

  logoutButton.addEventListener('click', async () => {
    if (!state.supabaseClient) {
      return;
    }

    await state.supabaseClient.auth.signOut();
    state.currentUser = null;
    state.syncMode = 'local';
    state.profile = loadLocalProfile();
    setAuthMessage('');
    setSyncStatus('Modo local');
    renderProfileForm();
    updateAuthUI();
  });
}

async function signIn() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;

  setAuthMessage('Entrando...');

  const { data, error } = await state.supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    setAuthMessage(error.message);
    return;
  }

  state.currentUser = data.user;
  setAuthMessage('');
  updateAuthUI();
  await hydrateRemoteHistory();
  await hydrateRemoteProfile();
}

async function signUp() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;

  setAuthMessage('Criando conta...');

  const { data, error } = await state.supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
    setAuthMessage(error.message);
    return;
  }

  if (data.session) {
    state.currentUser = data.user;
    setAuthMessage('');
    updateAuthUI();
    await hydrateRemoteHistory();
    await hydrateRemoteProfile();
    return;
  }

  setAuthMessage('Conta criada. Confirme o e-mail para entrar.');
}

function updateAuthUI() {
  const authShell = document.getElementById('authShell');
  const appShell = document.querySelector('.app-shell');
  const setupNotice = document.getElementById('setupNotice');
  const logoutButton = document.getElementById('logoutButton');
  const profileButton = document.getElementById('accountProfileButton');
  const needsLogin = state.remoteReady && !state.currentUser;

  authShell.hidden = !needsLogin;
  appShell.hidden = needsLogin;
  setupNotice.hidden = state.remoteReady;
  logoutButton.hidden = !state.currentUser;
  profileButton.hidden = !(state.currentUser || state.profile.name || state.profile.avatarUrl);
  renderProfileAvatar();

  if (!state.remoteReady) {
    setSyncStatus('Modo local');
  } else if (state.currentUser) {
    setSyncStatus(`Nuvem: ${state.currentUser.email}`);
  } else {
    setSyncStatus('Login necessário');
  }
}

function bindNavigation() {
  const menuToggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.menu');

  menuToggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('active');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      showTab(button.dataset.tab);
      menu.classList.remove('active');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

function showTab(tabName) {
  state.selectedTab = tabName;

  document.querySelectorAll('[data-panel]').forEach((panel) => {
    const isActive = panel.dataset.panel === tabName;
    panel.hidden = !isActive;
    panel.classList.toggle('active', isActive);
  });

  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tabName);
  });

  if (tabName === 'registro') {
    renderCalendar();
    renderSelectedDate();
    renderMonthTotal();
  }

  if (tabName === 'perfil') {
    renderProfileForm();
  }
}

function bindSaidaForm() {
  document.getElementById('saida-form').addEventListener('submit', (event) => {
    event.preventDefault();

    const entrada = document.getElementById('entrada').value;
    const horasTrabalho = readNumber('horasTrabalho');
    const minutosAlmoco = readNumber('minutosAlmoco');
    const resultado = document.getElementById('saidaResultado');

    if (!entrada || !isValidNumber(horasTrabalho) || !isValidNumber(minutosAlmoco)) {
      resultado.textContent = 'Preencha todos os campos com valores válidos.';
      return;
    }

    const resultadoSaida = calculateExitTime(entrada, horasTrabalho, minutosAlmoco);

    resultado.innerHTML = `
      <span>Você deve sair às</span>
      <strong>${resultadoSaida.clock}</strong>
      ${resultadoSaida.nextDay ? '<small>no dia seguinte</small>' : ''}
    `;
  });
}

function bindExtrasForm() {
  document.getElementById('extras-form').addEventListener('submit', (event) => {
    event.preventDefault();

    const salarioMensal = readNumber('salarioMensal');
    const divisorMensal = readNumber('divisorMensal');
    const adicionalExtra = readNumber('adicionalExtra');
    const horasExtrasMes = readNumber('horasExtrasMes');
    const resultado = document.getElementById('extrasResultado');

    if (
      !isValidNumber(salarioMensal) ||
      !isValidNumber(divisorMensal) ||
      !isValidNumber(adicionalExtra) ||
      !isValidNumber(horasExtrasMes) ||
      divisorMensal <= 0
    ) {
      resultado.textContent = 'Preencha todos os campos com valores válidos.';
      return;
    }

    const resultadoExtras = calculateOvertime(
      salarioMensal,
      divisorMensal,
      adicionalExtra,
      horasExtrasMes
    );

    resultado.innerHTML = `
      <span>Valor da hora extra</span>
      <strong>${formatCurrency(resultadoExtras.overtimeRate)}</strong>
      <small>Total estimado: ${formatCurrency(resultadoExtras.total)}</small>
    `;
  });
}

function calculateExitTime(entrada, horasTrabalho, minutosAlmoco) {
  const [horas, minutos] = entrada.split(':').map(Number);
  const totalMinutos = horas * 60 + minutos + horasTrabalho * 60 + minutosAlmoco;
  const saidaMinutos = normalizeMinutes(totalMinutos);

  return {
    clock: formatClock(saidaMinutos),
    nextDay: totalMinutos >= 24 * 60
  };
}

function calculateOvertime(salarioMensal, divisorMensal, adicionalExtra, horasExtrasMes) {
  const valorHora = salarioMensal / divisorMensal;
  const multiplicadorExtra = 1 + adicionalExtra / 100;
  const overtimeRate = valorHora * multiplicadorExtra;

  return {
    overtimeRate,
    total: horasExtrasMes * overtimeRate
  };
}

function bindRegistroForm() {
  document.getElementById('registro-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!state.selectedDate) {
      setRegistroMessage('Selecione uma data no calendário.');
      return;
    }

    const horasExtras = readNumber('horasExtras');

    if (!isValidNumber(horasExtras)) {
      setRegistroMessage('Informe uma quantidade válida de horas.');
      return;
    }

    const entry = createEntry(horasExtras, document.getElementById('observacaoDia').value);
    state.history[state.selectedDate] = entry;
    saveLocalHistory();
    renderCalendar();
    renderSelectedDate();
    renderMonthTotal();

    await persistRemoteEntry(state.selectedDate, entry);
  });

  document.getElementById('excluirDia').addEventListener('click', async () => {
    if (!state.selectedDate) {
      setRegistroMessage('Selecione uma data para excluir.');
      return;
    }

    const dateKey = state.selectedDate;
    delete state.history[dateKey];
    clearSelectedInputs();
    saveLocalHistory();
    renderCalendar();
    renderSelectedDate();
    renderMonthTotal();

    await deleteRemoteEntry(dateKey);
  });

  document.getElementById('limparHistorico').addEventListener('click', async () => {
    const monthPrefix = getMonthPrefix(state.calendarDate);

    Object.keys(state.history).forEach((dateKey) => {
      if (dateKey.startsWith(monthPrefix)) {
        delete state.history[dateKey];
      }
    });

    clearSelectedInputs();
    saveLocalHistory();
    renderCalendar();
    renderSelectedDate();
    renderMonthTotal();

    await deleteRemoteMonth(monthPrefix);
  });

  document.getElementById('mesAnterior').addEventListener('click', () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
    state.selectedDate = null;
    clearSelectedInputs();
    renderCalendar();
    renderSelectedDate();
    renderMonthTotal();
  });

  document.getElementById('proximoMes').addEventListener('click', () => {
    state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
    state.selectedDate = null;
    clearSelectedInputs();
    renderCalendar();
    renderSelectedDate();
    renderMonthTotal();
  });
}

function bindProfileForm() {
  document.getElementById('profile-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    state.profile = readProfileForm();
    saveLocalProfile();
    renderProfileForm();
    applyProfileDefaults({ silent: true });

    await persistRemoteProfile();
  });

  document.getElementById('profilePhoto').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setProfileMessage('Escolha uma imagem válida.');
      return;
    }

    try {
      setProfileMessage('Preparando foto...');
      state.profile.avatarUrl = await resizeAvatarFile(file);
      saveLocalProfile();
      renderProfileAvatar();
      renderProfileForm();
      setProfileMessage('Foto pronta. Salve o perfil para sincronizar.');
    } catch (error) {
      setProfileMessage(error.message);
    }
  });

  document.getElementById('applyProfileDefaults').addEventListener('click', () => {
    applyProfileDefaults({ silent: false });
  });
}

function readProfileForm() {
  return normalizeProfile({
    name: document.getElementById('profileName').value,
    role: document.getElementById('profileRole').value,
    avatarUrl: state.profile.avatarUrl,
    workHours: readOptionalNumber('profileWorkHours'),
    lunchMinutes: readOptionalNumber('profileLunchMinutes'),
    salary: readOptionalNumber('profileSalary'),
    monthlyDivisor: readOptionalNumber('profileMonthlyDivisor') || 220,
    overtimePercent: readOptionalNumber('profileOvertimePercent') ?? 50
  });
}

function renderProfileForm() {
  const profile = normalizeProfile(state.profile);
  state.profile = profile;

  setInputValue('profileName', profile.name);
  setInputValue('profileRole', profile.role);
  setInputValue('profileWorkHours', profile.workHours);
  setInputValue('profileLunchMinutes', profile.lunchMinutes);
  setInputValue('profileSalary', profile.salary);
  setInputValue('profileMonthlyDivisor', profile.monthlyDivisor);
  setInputValue('profileOvertimePercent', profile.overtimePercent);
  renderProfileAvatar();
}

function renderProfileAvatar() {
  const profile = normalizeProfile(state.profile);
  const preview = document.getElementById('profileAvatarPreview');
  const initials = document.getElementById('profileInitials');
  const accountAvatar = document.getElementById('accountAvatar');
  const initialsText = getInitials(profile.name || state.currentUser?.email || '?');

  initials.textContent = initialsText;
  accountAvatar.innerHTML = '';
  accountAvatar.textContent = initialsText;

  if (profile.avatarUrl) {
    preview.src = profile.avatarUrl;
    preview.hidden = false;
    initials.hidden = true;
    accountAvatar.textContent = '';
    const image = document.createElement('img');
    image.src = profile.avatarUrl;
    image.alt = '';
    accountAvatar.appendChild(image);
    return;
  }

  preview.removeAttribute('src');
  preview.hidden = true;
  initials.hidden = false;
}

function applyProfileDefaults({ silent } = { silent: false }) {
  const profile = normalizeProfile(state.profile);

  setInputValue('horasTrabalho', profile.workHours);
  setInputValue('minutosAlmoco', profile.lunchMinutes);
  setInputValue('salarioMensal', profile.salary);
  setInputValue('divisorMensal', profile.monthlyDivisor);
  setInputValue('adicionalExtra', profile.overtimePercent);

  if (!silent) {
    setProfileMessage('Padrões aplicados nas calculadoras.');
  }
}

async function hydrateRemoteProfile() {
  if (!isCloudSessionReady()) {
    return;
  }

  const { data, error } = await state.supabaseClient
    .from('profiles')
    .select('display_name, role_title, avatar_url, default_work_hours, default_lunch_minutes, monthly_salary, monthly_divisor, overtime_percent')
    .eq('id', state.currentUser.id)
    .maybeSingle();

  if (error) {
    setProfileMessage(`Não foi possível carregar o perfil: ${error.message}`);
    return;
  }

  if (data) {
    state.profile = normalizeProfile({
      name: data.display_name,
      role: data.role_title,
      avatarUrl: data.avatar_url,
      workHours: data.default_work_hours,
      lunchMinutes: data.default_lunch_minutes,
      salary: data.monthly_salary,
      monthlyDivisor: data.monthly_divisor,
      overtimePercent: data.overtime_percent
    });
  } else {
    state.profile = normalizeProfile({
      ...loadLocalProfile(),
      name: loadLocalProfile().name || getNameFromEmail(state.currentUser.email)
    });
    await persistRemoteProfile({ quiet: true });
  }

  saveLocalProfile();
  renderProfileForm();
  applyProfileDefaults({ silent: true });
  updateAuthUI();
}

async function persistRemoteProfile({ quiet } = { quiet: false }) {
  if (!isCloudSessionReady()) {
    if (!quiet) {
      setProfileMessage('Perfil salvo neste aparelho.');
    }
    return;
  }

  const { error } = await state.supabaseClient
    .from('profiles')
    .upsert(toRemoteProfilePayload(), { onConflict: 'id' });

  if (error) {
    setProfileMessage(`Perfil salvo localmente. Falha na nuvem: ${error.message}`);
    return;
  }

  if (!quiet) {
    setProfileMessage('Perfil salvo e sincronizado.');
  }
}

function toRemoteProfilePayload() {
  const profile = normalizeProfile(state.profile);

  return {
    id: state.currentUser.id,
    display_name: profile.name || null,
    role_title: profile.role || null,
    avatar_url: profile.avatarUrl || null,
    default_work_hours: profile.workHours,
    default_lunch_minutes: profile.lunchMinutes,
    monthly_salary: profile.salary,
    monthly_divisor: profile.monthlyDivisor,
    overtime_percent: profile.overtimePercent
  };
}

function resizeAvatarFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 512;
        const scale = Math.min(size / image.width, size / image.height, 1);
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };

      image.onerror = () => reject(new Error('Não foi possível carregar a imagem.'));
      image.src = reader.result;
    };

    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

async function hydrateRemoteHistory() {
  if (!isCloudSessionReady()) {
    return;
  }

  setSyncStatus('Sincronizando...');

  const localHistory = loadLocalHistory();
  const remoteHistory = await fetchRemoteHistory();

  if (!remoteHistory) {
    state.history = localHistory;
    setSyncStatus('Modo local');
    return;
  }

  const missingLocalEntries = Object.entries(localHistory)
    .filter(([dateKey]) => !remoteHistory[dateKey])
    .map(([dateKey, entry]) => [dateKey, normalizeEntry(entry)])
    .filter(([, entry]) => entry);

  if (missingLocalEntries.length > 0) {
    await upsertRemoteEntries(missingLocalEntries);
  }

  state.history = {
    ...localHistory,
    ...remoteHistory
  };

  saveLocalHistory();
  setSyncStatus(`Nuvem: ${state.currentUser.email}`);
  renderCalendar();
  renderSelectedDate();
  renderMonthTotal();
}

async function fetchRemoteHistory() {
  const { data, error } = await state.supabaseClient
    .from('overtime_entries')
    .select('work_date, hours, notes')
    .order('work_date', { ascending: true });

  if (error) {
    setRegistroMessage(`Não foi possível carregar a nuvem: ${error.message}`);
    return null;
  }

  return data.reduce((acc, item) => {
    acc[item.work_date] = createEntry(Number(item.hours), item.notes || '');
    return acc;
  }, {});
}

async function persistRemoteEntry(dateKey, entry) {
  if (!isCloudSessionReady()) {
    setRegistroMessage(`${formatDateLabel(dateKey)} salvo neste aparelho.`);
    return;
  }

  const { error } = await state.supabaseClient
    .from('overtime_entries')
    .upsert(toRemotePayload(dateKey, entry), { onConflict: 'user_id,work_date' });

  if (error) {
    setRegistroMessage(`${formatDateLabel(dateKey)} salvo localmente. Falha na nuvem: ${error.message}`);
    return;
  }

  setRegistroMessage(`${formatDateLabel(dateKey)} salvo e sincronizado.`);
}

async function upsertRemoteEntries(entries) {
  if (!isCloudSessionReady() || entries.length === 0) {
    return;
  }

  const { error } = await state.supabaseClient
    .from('overtime_entries')
    .upsert(entries.map(([dateKey, entry]) => toRemotePayload(dateKey, entry)), {
      onConflict: 'user_id,work_date'
    });

  if (error) {
    setRegistroMessage(`Alguns registros locais não sincronizaram: ${error.message}`);
  }
}

async function deleteRemoteEntry(dateKey) {
  if (!isCloudSessionReady()) {
    setRegistroMessage(`${formatDateLabel(dateKey)} removido deste aparelho.`);
    return;
  }

  const { error } = await state.supabaseClient
    .from('overtime_entries')
    .delete()
    .eq('work_date', dateKey);

  if (error) {
    setRegistroMessage(`Removido localmente. Falha na nuvem: ${error.message}`);
    return;
  }

  setRegistroMessage(`${formatDateLabel(dateKey)} removido da nuvem.`);
}

async function deleteRemoteMonth(monthPrefix) {
  if (!isCloudSessionReady()) {
    setRegistroMessage('Registros do mês removidos deste aparelho.');
    return;
  }

  const nextMonth = getNextMonthPrefix(monthPrefix);
  const { error } = await state.supabaseClient
    .from('overtime_entries')
    .delete()
    .gte('work_date', `${monthPrefix}-01`)
    .lt('work_date', `${nextMonth}-01`);

  if (error) {
    setRegistroMessage(`Mês limpo localmente. Falha na nuvem: ${error.message}`);
    return;
  }

  setRegistroMessage('Registros do mês removidos da nuvem.');
}

function toRemotePayload(dateKey, entry) {
  return {
    user_id: state.currentUser.id,
    work_date: dateKey,
    hours: entry.hours,
    notes: entry.note || null
  };
}

function isCloudSessionReady() {
  return Boolean(state.remoteReady && state.supabaseClient && state.currentUser);
}

function renderCalendar() {
  const body = document.getElementById('corpoCalendario');
  const monthLabel = document.getElementById('mesAtual');
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();

  body.innerHTML = '';
  monthLabel.textContent = state.calendarDate.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });

  let day = 1;

  for (let rowIndex = 0; rowIndex < 6; rowIndex++) {
    const row = document.createElement('tr');

    for (let columnIndex = 0; columnIndex < 7; columnIndex++) {
      const cell = document.createElement('td');

      if ((rowIndex === 0 && columnIndex < firstDay.getDay()) || day > totalDays) {
        cell.className = 'empty-day';
        row.appendChild(cell);
        continue;
      }

      const dateKey = toDateKey(year, month, day);
      const entry = getEntry(dateKey);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'day-button';
      button.dataset.date = dateKey;
      button.innerHTML = `
        <span>${day}</span>
        ${entry ? `<small>${formatHours(entry.hours)}</small>` : ''}
      `;

      button.classList.toggle('has-entry', Boolean(entry));
      button.classList.toggle('selected', state.selectedDate === dateKey);
      button.addEventListener('click', () => selectDate(dateKey));

      cell.appendChild(button);
      row.appendChild(cell);
      day += 1;
    }

    body.appendChild(row);

    if (day > totalDays) {
      break;
    }
  }
}

function selectDate(dateKey) {
  state.selectedDate = dateKey;
  const entry = getEntry(dateKey);

  document.getElementById('horasExtras').value = entry ? entry.hours : '';
  document.getElementById('observacaoDia').value = entry ? entry.note : '';
  renderCalendar();
  renderSelectedDate();
}

function renderSelectedDate() {
  const selectedDate = document.getElementById('dataSelecionada');

  if (!state.selectedDate) {
    selectedDate.textContent = 'Selecione uma data.';
    setRegistroMessage('Nenhum dia selecionado.');
    return;
  }

  const entry = getEntry(state.selectedDate);
  selectedDate.textContent = formatDateLabel(state.selectedDate);

  if (!entry) {
    setRegistroMessage(`${formatDateLabel(state.selectedDate)} sem registro.`);
    return;
  }

  setRegistroMessage(
    `${formatDateLabel(state.selectedDate)}: ${formatHours(entry.hours)} registradas.`
  );
}

function renderMonthTotal() {
  const monthPrefix = getMonthPrefix(state.calendarDate);
  const total = Object.entries(state.history)
    .filter(([dateKey]) => dateKey.startsWith(monthPrefix))
    .reduce((sum, [, entry]) => sum + getEntryHours(entry), 0);

  document.getElementById('totalMes').innerHTML = `
    <span>Total do mês</span>
    <strong>${formatHours(total)}</strong>
  `;
}

function setRegistroMessage(message) {
  document.getElementById('resultadoRegistro').textContent = message;
}

function setAuthMessage(message) {
  document.getElementById('authMessage').textContent = message;
}

function setProfileMessage(message) {
  document.getElementById('profileMessage').textContent = message;
}

function setSyncStatus(message) {
  document.getElementById('syncStatus').textContent = message;
}

function loadLocalProfile() {
  const profile = parseStorage(PROFILE_STORAGE_KEY);
  return normalizeProfile(profile || {});
}

function saveLocalProfile() {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalizeProfile(state.profile)));
}

function normalizeProfile(profile) {
  return {
    name: String(profile?.name || '').trim(),
    role: String(profile?.role || '').trim(),
    avatarUrl: String(profile?.avatarUrl || '').trim(),
    workHours: normalizeOptionalNumber(profile?.workHours),
    lunchMinutes: normalizeOptionalNumber(profile?.lunchMinutes),
    salary: normalizeOptionalNumber(profile?.salary),
    monthlyDivisor: normalizeOptionalNumber(profile?.monthlyDivisor) || 220,
    overtimePercent: normalizeOptionalNumber(profile?.overtimePercent) ?? 50
  };
}

function loadLocalHistory() {
  const current = parseStorage(STORAGE_KEY);

  if (current) {
    return normalizeHistory(current);
  }

  for (const key of LEGACY_STORAGE_KEYS) {
    const legacy = parseStorage(key);

    if (legacy) {
      return normalizeHistory(legacy);
    }
  }

  return {};
}

function normalizeHistory(history) {
  if (Array.isArray(history)) {
    return history.reduce((acc, item) => {
      if (item.data) {
        const entry = createEntry(Number(item.horasExtras), item.notes || item.note || '');

        if (entry) {
          acc[normalizeDateKey(item.data)] = entry;
        }
      }

      return acc;
    }, {});
  }

  return Object.entries(history).reduce((acc, [dateKey, entry]) => {
    const normalizedEntry = normalizeEntry(entry);

    if (normalizedEntry) {
      acc[normalizeDateKey(dateKey)] = normalizedEntry;
    }

    return acc;
  }, {});
}

function parseStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function saveLocalHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));
}

function createEntry(hours, note = '') {
  if (!isValidNumber(hours)) {
    return null;
  }

  return {
    hours: Number(hours),
    note: String(note || '').trim()
  };
}

function normalizeEntry(entry) {
  if (typeof entry === 'number') {
    return createEntry(entry);
  }

  if (!entry || typeof entry !== 'object') {
    return null;
  }

  return createEntry(Number(entry.hours), entry.note || entry.notes || '');
}

function getEntry(dateKey) {
  return normalizeEntry(state.history[dateKey]);
}

function getEntryHours(entry) {
  const normalizedEntry = normalizeEntry(entry);
  return normalizedEntry ? normalizedEntry.hours : 0;
}

function clearSelectedInputs() {
  document.getElementById('horasExtras').value = '';
  document.getElementById('observacaoDia').value = '';
}

function readNumber(id) {
  return Number(String(document.getElementById(id).value).replace(',', '.'));
}

function readOptionalNumber(id) {
  const value = String(document.getElementById(id).value).trim();

  if (!value) {
    return null;
  }

  return normalizeOptionalNumber(value);
}

function normalizeOptionalNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function setInputValue(id, value) {
  const input = document.getElementById(id);

  if (!input) {
    return;
  }

  input.value = value === null || value === undefined ? '' : value;
}

function isValidNumber(value) {
  return Number.isFinite(value) && value >= 0;
}

function normalizeMinutes(minutes) {
  return ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
}

function formatClock(totalMinutes) {
  const roundedMinutes = Math.round(totalMinutes);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatCurrency(value) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatHours(value) {
  return `${Number(value).toLocaleString('pt-BR', {
    maximumFractionDigits: 2
  })}h`;
}

function formatDateLabel(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function toDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return toDateKey(year, month - 1, day);
}

function getMonthPrefix(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getNextMonthPrefix(monthPrefix) {
  const [year, month] = monthPrefix.split('-').map(Number);
  const date = new Date(year, month, 1);
  return getMonthPrefix(date);
}

function getInitials(text) {
  const parts = String(text || '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getNameFromEmail(email) {
  return String(email || '').split('@')[0] || '';
}

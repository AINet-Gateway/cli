const RU = "ru";
const EN = "en";

const MESSAGES = {
  en: {
    help: `ainet — switch Claude Code & Codex between your subscription and AINet

Usage:
  ainet                          # show each tool's mode + offer a switch
  ainet setup                    # first-run wizard: install + device auth
  ainet login                    # alias for setup, re-runs auth
  ainet status                   # show status + interactive switch
  ainet use <ainet|subscription> [tool]
                                 # flip a tool (or both) to a mode
  ainet --version
  ainet help

Flags:
  --dry-run, -n     Print every change without touching anything on disk.

The switch only rewrites an AINet-managed config override; your subscription
login (Claude Code Keychain entry, Codex ~/.codex/auth.json) is never touched.

Environment:
  AINET_LANG           Force interface language: ru or en.
  AINET_GATEWAY_URL    Override the gateway base URL (default https://ainet.bytestrike.dev).
  AINET_DEBUG=1        Print verbose protocol traces.

Source: https://github.com/AINet-Gateway/cli
`,
    usageUse: "Usage: ainet use <ainet|subscription> [claude|codex]",
    unknownTool: "Unknown tool: {tool}. Expected claude or codex.",
    unknownCommand: 'Unknown command: {command}. Run "ainet help" for usage.',
    setupTagline: "   Setup tool for Claude Code & Codex",
    modeAinet: "AINet",
    modeSubscription: "subscription",
    listAnd: " and ",
    setupCancelled: "Setup cancelled. No changes made.",
    detectingSystem: "Detecting system...",
    hostname: "Hostname: {hostname}",
    shell: "Shell: {shell}",
    gateway: "Gateway: {gateway}",
    checkingTools: "Checking installed tools...",
    nodeTooOld:
      "Node.js {version} detected - AINet CLI requires Node 20+. Install the LTS release from https://nodejs.org and re-run this command.",
    notInstalled: "not installed",
    setupRequiresTty:
      "Setup requires an interactive terminal. Re-run `ainet setup` without stdin redirection.",
    selectTools: "Which coding agents would you like to switch to AINet?",
    promptHintSelect: "Space to select, Enter to confirm.",
    promptHintSelectOne: "Use arrows, Enter to confirm.",
    noToolsSelected: "No tools selected. Re-run `ainet setup` when you'd like to configure one.",
    installMissingPrompt: "Install missing tools: {tools}?",
    installMissingYes: "Install missing tools",
    installMissingNo: "Skip missing tools",
    installMissingSkipped: "Skipped missing tools: {tools}.",
    noToolsAfterInstallSkip: "No selected installed tools remain. Re-run `ainet setup` when you want to install them.",
    skippingTool: "Skipping {tool}: {message}",
    scopesTitle: "Key scopes",
    scopesClaude: "Claude Code: anthropic:messages, anthropic:models, anthropic:count_tokens",
    scopesCodex: "Codex: openai:responses, openai:chat_completions, openai:models",
    scopesHint: "These are the standard least-privilege scopes for the selected tools. Use Advanced only if you want to change them manually.",
    advancedScopes: "Advanced: customize the key scopes?",
    selectScopes: "Select the scopes to request for this key.",
    requiredScopesMissing:
      "Selected scopes cannot run the selected tools. Add the required scopes: {scopes}",
    promptHintToggle: "Space to toggle, Enter to confirm.",
    dryRunPreview: "Dry run - previewing AINet activation...",
    planRequestDeviceCode:
      "Authorization: device-code request to {url}/user/v1/device-codes (scopes: {scopes})",
    planOpenBrowser: "Approval: browser opens {url}/panel/connect",
    planSaveKey: "Key storage: tool-specific files under ~/.ainet/ (0600)",
    planWriteClaude:
      "Claude Code: {file} gets ANTHROPIC_BASE_URL={url}/anthropic + ANTHROPIC_AUTH_TOKEN",
    planWriteCodex:
      'Codex: {file} gets model_provider="ainet" + [model_providers.ainet]',
    planSmoke: "Smoke test: {routes}",
    planSkipSmoke: "Smoke test: skipped because selected scopes omit model-list access",
    dryRunNoChanges: "Dry run - nothing on your machine was changed.",
    dryRunSetupDone: "Dry run - nothing on your machine was changed. Re-run without --dry-run to apply.",
    requestingDeviceCode: "Requesting device authorization from the gateway...",
    deviceCodeReachFailed: "Could not reach {url}: {message}",
    checkNetwork: "Check your network or AINET_GATEWAY_URL and re-run `ainet setup`.",
    gotCode: "Got a one-time code: {code}",
    openUrl: "Open this URL in your browser:",
    approveHint: 'If you are already logged in, you will just see "Approve" - click it, and we will continue here.',
    codeExpires: "(Code expires in {minutes} min.)",
    browserOpened: "Browser opened.",
    browserOpenFailed: "Could not open the browser automatically - paste the URL above manually.",
    waitingApproval: "Waiting for approval...",
    waiting: "waiting... {seconds}s left",
    authorizationTimedOut: "Authorization timed out. Re-run `ainet setup` to get a fresh code.",
    authorizationDenied: "Authorization was denied.",
    approvedKey: 'Approved - key {prefix}... ("{name}") issued.',
    activatingAinet: "Activating AINet mode...",
    activatedTool: "{label} -> AINet ({file})",
    runningSmoke: "Running smoke test...",
    smokeSkipped: "Smoke test skipped: the selected key scopes do not include model-list access.",
    smokePassed: "Gateway smoke test passed ({summary}) - AINet is live.",
    smokeFailed: "Smoke test failed: {message}",
    configWrittenButIssue:
      "Your config is written, but something is off - see the gateway status page or contact support.",
    setupDone: "You are set. Switch modes any time:",
    nextCommandStatus: "  ainet                       # show status + toggle",
    nextCommandSubscription: "  ainet use subscription       # back to your own login",
    nextCommandAinet: "  ainet use ainet              # back to AINet",
    subscriptionUntouched: "Your subscription credentials were never touched.",
    managePanel: "Manage your keys + balance: {url}/panel",
    installPlan: "install {label}:  {script}",
    nativeInstallUnsupported:
      "Native binary install for {label} is not yet supported on Windows. Install it manually, then re-run `ainet setup`.",
    windowsInstallUnsupported: "{tool}: Windows binary install unsupported",
    installing: "Installing {label}...",
    primaryInstallerFailed: "Primary installer failed (exit {code}); trying Homebrew cask...",
    installingFailed: "Installing {label} failed with exit code {code}.\nRun the installer manually:\n  {script}",
    installed: "{label} installed.",
    updatePlan: "update {label}:  {command}",
    updating: "Updating {label}...",
    updateFailedMaybeCurrent: "`{command}` exited {code}. You may already be up to date.",
    updated: "{label} updated.",
    unknownToolShort: "Unknown tool: {tool}",
    networkError: "Network error talking to {url}: {message}",
    deviceStartFailed: "Failed to start device authorization.",
    authorizationIncomplete: "Authorization could not be completed.",
    deviceExpired: "Device code expired before the user approved it.",
    statusTitle: "AINet switcher status",
    installedStatus: "installed ({version})",
    modeLine: "{tool} {installLabel} mode: {mode}{drift}",
    stateSaid: "  (state said {mode})",
    neitherInstalled: "Neither tool is installed. Run `ainet setup` to install and authorize.",
    nonInteractiveStatus: "Non-interactive terminal detected; no switch prompt shown.",
    targetSubscription: "your subscription",
    switchChoice: "Switch {tool} to {target}",
    noKeyForSwitch: "No AINet key found. Run `ainet setup` before switching tools to AINet.",
    doNothing: "Do nothing",
    switchPrompt: "Switch a tool?",
    noChanges: "No changes made.",
    noAinetKey: "No AINet key available - run `ainet setup` first to authorize this device.",
    codexKeyMissingScopes:
      "The saved AINet key is not authorized for Codex. Run `ainet setup` and select Codex.",
    unknownMode: "Unknown mode: {mode}",
    setClaude: "set ANTHROPIC_BASE_URL={url}/anthropic + ANTHROPIC_AUTH_TOKEN in {file}",
    backupSettings: "backed up previous settings -> {file}",
    removeClaude: "remove AINet env keys from {file} (subscription OAuth resumes)",
    noClaudeOverride: "no AINet env override found in {file}",
    setCodex: 'set model_provider="ainet" (+ credential helper) in {file}',
    backupConfig: "backed up previous config -> {file}",
    restoreCodex: 'restore model_provider="{provider}" in {file}',
    noCodexBlock: "no AINet provider block found in {file}",
    wouldSwitch: "Would switch {tool} -> {target}",
    switched: "Switched {tool} -> {target}",
    verifyClaude: "Verify inside Claude Code with `/status`.",
    verifyCodex: "Verify with `codex login status`."
  },
  ru: {
    help: `ainet — переключает Claude Code и Codex между вашей подпиской и AINet

Использование:
  ainet                          # показать режимы инструментов и предложить переключение
  ainet setup                    # первый запуск: установка + авторизация устройства
  ainet login                    # alias для setup, повторяет авторизацию
  ainet status                   # статус + интерактивное переключение
  ainet use <ainet|subscription> [tool]
                                 # переключить инструмент или оба инструмента
  ainet --version
  ainet help

Флаги:
  --dry-run, -n     Показать изменения, ничего не записывая на диск.

Переключатель меняет только AINet-managed config override; ваша подписка
(Claude Code Keychain, Codex ~/.codex/auth.json) не трогается.

Окружение:
  AINET_LANG           Принудительный язык интерфейса: ru или en.
  AINET_GATEWAY_URL    Переопределить gateway URL (по умолчанию https://ainet.bytestrike.dev).
  AINET_DEBUG=1        Печатать подробные protocol traces.

Source: https://github.com/AINet-Gateway/cli
`,
    usageUse: "Использование: ainet use <ainet|subscription> [claude|codex]",
    unknownTool: "Неизвестный инструмент: {tool}. Ожидается claude или codex.",
    unknownCommand: 'Неизвестная команда: {command}. Запустите "ainet help".',
    setupTagline: "   Настройка Claude Code и Codex",
    modeAinet: "AINet",
    modeSubscription: "подписка",
    listAnd: " и ",
    setupCancelled: "Настройка отменена. Изменений нет.",
    detectingSystem: "Проверяю систему...",
    hostname: "Хост: {hostname}",
    shell: "Shell: {shell}",
    gateway: "Gateway: {gateway}",
    checkingTools: "Проверяю установленные инструменты...",
    nodeTooOld:
      "Обнаружен Node.js {version} - AINet CLI требует Node 20+. Установите LTS с https://nodejs.org и повторите команду.",
    notInstalled: "не установлен",
    setupRequiresTty:
      "Setup требует интерактивный терминал. Запустите `ainet setup` без перенаправления stdin.",
    selectTools: "Какие coding agents переключить на AINet?",
    promptHintSelect: "Space - выбрать, Enter - подтвердить.",
    promptHintSelectOne: "Стрелки - выбрать, Enter - подтвердить.",
    noToolsSelected: "Инструменты не выбраны. Запустите `ainet setup`, когда захотите настроить CLI.",
    installMissingPrompt: "Установить отсутствующие инструменты: {tools}?",
    installMissingYes: "Установить отсутствующие",
    installMissingNo: "Пропустить отсутствующие",
    installMissingSkipped: "Отсутствующие инструменты пропущены: {tools}.",
    noToolsAfterInstallSkip: "Среди выбранных не осталось установленных инструментов. Запустите `ainet setup`, когда захотите их установить.",
    skippingTool: "Пропускаю {tool}: {message}",
    scopesTitle: "Scopes ключа",
    scopesClaude: "Claude Code: anthropic:messages, anthropic:models, anthropic:count_tokens",
    scopesCodex: "Codex: openai:responses, openai:chat_completions, openai:models",
    scopesHint: "Это стандартные least-privilege scopes для выбранных инструментов. Advanced нужен только если хотите изменить их вручную.",
    advancedScopes: "Дополнительно: настроить scopes ключа?",
    selectScopes: "Выберите scopes для нового ключа.",
    requiredScopesMissing:
      "Выбранные scopes не подходят для выбранных инструментов. Добавьте обязательные scopes: {scopes}",
    promptHintToggle: "Space - переключить, Enter - подтвердить.",
    dryRunPreview: "Dry run - показываю план активации AINet...",
    planRequestDeviceCode:
      "Авторизация: device-code запрос к {url}/user/v1/device-codes (scopes: {scopes})",
    planOpenBrowser: "Подтверждение: браузер откроет {url}/panel/connect",
    planSaveKey: "Ключ: отдельные файлы инструментов в ~/.ainet/ (права 0600)",
    planWriteClaude:
      "Claude Code: {file} получит ANTHROPIC_BASE_URL={url}/anthropic + ANTHROPIC_AUTH_TOKEN",
    planWriteCodex:
      'Codex: {file} получит model_provider="ainet" + [model_providers.ainet]',
    planSmoke: "Проверка: {routes}",
    planSkipSmoke: "Проверка: пропущена, потому что выбранные scopes не дают доступ к списку моделей",
    dryRunNoChanges: "Dry run - на машине ничего не изменено.",
    dryRunSetupDone: "Dry run - на машине ничего не изменено. Запустите без --dry-run, чтобы применить.",
    requestingDeviceCode: "Запрашиваю авторизацию устройства через gateway...",
    deviceCodeReachFailed: "Не удалось достучаться до {url}: {message}",
    checkNetwork: "Проверьте сеть или AINET_GATEWAY_URL и повторите `ainet setup`.",
    gotCode: "Получен одноразовый код: {code}",
    openUrl: "Откройте этот URL в браузере:",
    approveHint: 'Если вы уже вошли, увидите кнопку "Approve" - нажмите её, и CLI продолжит.',
    codeExpires: "(Код истекает через {minutes} мин.)",
    browserOpened: "Браузер открыт.",
    browserOpenFailed: "Не удалось открыть браузер автоматически - вставьте URL выше вручную.",
    waitingApproval: "Жду подтверждения...",
    waiting: "ожидание... осталось {seconds}s",
    authorizationTimedOut: "Время авторизации истекло. Запустите `ainet setup`, чтобы получить новый код.",
    authorizationDenied: "Авторизация отклонена.",
    approvedKey: 'Подтверждено - ключ {prefix}... ("{name}") выдан.',
    activatingAinet: "Включаю режим AINet...",
    activatedTool: "{label} -> AINet ({file})",
    runningSmoke: "Запускаю smoke test...",
    smokeSkipped: "Smoke test пропущен: выбранные scopes не включают доступ к списку моделей.",
    smokePassed: "Gateway smoke test пройден ({summary}) - AINet включён.",
    smokeFailed: "Smoke test не прошёл: {message}",
    configWrittenButIssue:
      "Конфиг записан, но что-то не так - проверьте status page gateway или обратитесь в поддержку.",
    setupDone: "Готово. Переключать режимы можно в любой момент:",
    nextCommandStatus: "  ainet                       # показать статус + переключатель",
    nextCommandSubscription: "  ainet use subscription       # вернуться на свою подписку",
    nextCommandAinet: "  ainet use ainet              # снова включить AINet",
    subscriptionUntouched: "Ваши credentials подписки не трогались.",
    managePanel: "Ключи и баланс: {url}/panel",
    installPlan: "установить {label}:  {script}",
    nativeInstallUnsupported:
      "Native binary install для {label} пока не поддержан на Windows. Установите вручную и повторите `ainet setup`.",
    windowsInstallUnsupported: "{tool}: установка binary на Windows не поддержана",
    installing: "Устанавливаю {label}...",
    primaryInstallerFailed: "Основной installer упал (exit {code}); пробую Homebrew cask...",
    installingFailed: "Установка {label} завершилась с кодом {code}.\nЗапустите installer вручную:\n  {script}",
    installed: "{label} установлен.",
    updatePlan: "обновить {label}:  {command}",
    updating: "Обновляю {label}...",
    updateFailedMaybeCurrent: "`{command}` завершился с кодом {code}. Возможно, всё уже обновлено.",
    updated: "{label} обновлён.",
    unknownToolShort: "Неизвестный инструмент: {tool}",
    networkError: "Сетевая ошибка при обращении к {url}: {message}",
    deviceStartFailed: "Не удалось начать авторизацию устройства.",
    authorizationIncomplete: "Авторизацию не удалось завершить.",
    deviceExpired: "Device code истёк до подтверждения пользователем.",
    statusTitle: "Статус AINet switcher",
    installedStatus: "установлен ({version})",
    modeLine: "{tool} {installLabel} режим: {mode}{drift}",
    stateSaid: "  (state: {mode})",
    neitherInstalled: "Инструменты не установлены. Запустите `ainet setup` для установки и авторизации.",
    nonInteractiveStatus: "Неинтерактивный терминал: вопрос о переключении не показан.",
    targetSubscription: "вашу подписку",
    switchChoice: "Переключить {tool} на {target}",
    noKeyForSwitch: "Ключ AINet не найден. Запустите `ainet setup` перед переключением инструментов на AINet.",
    doNothing: "Ничего не менять",
    switchPrompt: "Переключить инструмент?",
    noChanges: "Изменений нет.",
    noAinetKey: "Ключ AINet не найден - сначала запустите `ainet setup`, чтобы авторизовать устройство.",
    codexKeyMissingScopes:
      "Сохранённый ключ AINet не подходит для Codex. Запустите `ainet setup` и выберите Codex.",
    unknownMode: "Неизвестный режим: {mode}",
    setClaude: "записать ANTHROPIC_BASE_URL={url}/anthropic + ANTHROPIC_AUTH_TOKEN в {file}",
    backupSettings: "backup предыдущих settings -> {file}",
    removeClaude: "удалить AINet env keys из {file} (subscription OAuth снова активен)",
    noClaudeOverride: "AINet env override не найден в {file}",
    setCodex: 'записать model_provider="ainet" (+ credential helper) в {file}',
    backupConfig: "backup предыдущего config -> {file}",
    restoreCodex: 'восстановить model_provider="{provider}" в {file}',
    noCodexBlock: "AINet provider block не найден в {file}",
    wouldSwitch: "Переключил бы {tool} -> {target}",
    switched: "Переключил {tool} -> {target}",
    verifyClaude: "Проверьте внутри Claude Code через `/status`.",
    verifyCodex: "Проверьте через `codex login status`."
  }
};

export function detectLanguage(env = process.env) {
  const forced = normalizeLanguage(env.AINET_LANG);
  if (forced) return forced;
  for (const key of ["LC_ALL", "LC_MESSAGES", "LANG"]) {
    const detected = normalizeLanguage(env[key]);
    if (detected) return detected;
  }
  return EN;
}

function normalizeLanguage(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "ru" || normalized.startsWith("ru_") || normalized.startsWith("ru-")) {
    return RU;
  }
  if (normalized === "en" || normalized.startsWith("en_") || normalized.startsWith("en-")) {
    return EN;
  }
  return null;
}

export function t(key, vars = {}) {
  return format(MESSAGES[detectLanguage()]?.[key] ?? MESSAGES.en[key] ?? key, vars);
}

export function tr(lang, key, vars = {}) {
  const normalized = normalizeLanguage(lang) ?? EN;
  return format(MESSAGES[normalized]?.[key] ?? MESSAGES.en[key] ?? key, vars);
}

export function joinList(items, lang = detectLanguage()) {
  const normalized = normalizeLanguage(lang) ?? EN;
  const parts = Array.from(items, (item) => String(item));
  if (parts.length <= 1) return parts.join("");
  const last = parts.at(-1);
  const head = parts.slice(0, -1);
  return `${head.join(", ")}${tr(normalized, "listAnd")}${last}`;
}

function format(template, vars) {
  return String(template).replace(/\{([A-Za-z0-9_]+)\}/g, (match, key) => {
    const value = vars[key];
    return value === undefined || value === null ? match : String(value);
  });
}

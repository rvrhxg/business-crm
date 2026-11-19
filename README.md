# Contour — Business CRM

Самостоятельный проект портфолио, не коммерческий опыт. Цель: клиенты, сделки, воронка продаж, задачи и аналитика. Node.js 24, SQLite, REST API и браузерный интерфейс. Бюджет 0 рублей, внешние платные услуги не используются.

Реализованы cookie-авторизация, REST API клиентов/сделок/заметок/задач, изоляция аккаунтов, целочисленные суммы в копейках, этапы сделки и транзакционная история изменений. Интерфейс Contour показывает воронку, клиентов, агрегаты продаж и карточку сделки; доступны создание заметок и задач, завершение задач и смена этапа. Списки ограничены последними 200 записями, поиск в интерфейсе работает по этому списку; агрегаты продаж считают все сделки владельца.

Локально: Node.js 24, `npm start`, открыть http://localhost:3001. Создайте аккаунт с паролем от 12 символов; затем клиента и сделку. Внешних npm-зависимостей нет. Проверка: `npm test`. Шесть автоматических тестов, Docker build, сохранение сделки после перезапуска контейнера и сценарий Chromium успешно прошли в [CI 43850465937](https://github.com/rvrhxg/business-crm/actions/runs/43850465937). Браузер проверил регистрацию, создание клиента и сделки, заметку, задачу, выполнение задачи и смену этапа. Реальные снимки desktop/mobile просмотрены визуально.

Docker: `docker compose up --build -d`. Данные сохраняются в именованном томе crm-data; сервер публикуется только на localhost:3001. Для HTTPS нужны NODE_ENV=production, точный APP_ORIGIN и TLS proxy. Не выдавайте эту разработку за production-сервис: нет команд/организаций, уведомлений, восстановления пароля и масштабируемого limiter.

Закрытые выигранные/проигранные сделки нельзя переводить обратно: для повторной продажи создаётся новая сделка. В первой версии каждый аккаунт работает со своей клиентской базой; общие команды/организации пока не поддерживаются.

## Скриншоты

![Воронка](docs/screenshots/pipeline-desktop.png)
![Карточка сделки](docs/screenshots/deal-desktop.png)

[Мобильная версия](docs/screenshots/pipeline-mobile.png)

[Все проекты портфолио и инструкции запуска](docs/PORTFOLIO.md).


## List pagination

GET list endpoints accept limit (1..100, default50) and offset (0..10000000). Responses remain JSON arrays with X-Total-Count scoped to the signed-in owner; CRM deal totals also respect stage. Stable order: descending ID for CRM; occurred_on descending, ID descending for Ledger. UI loads50 at a time with Show more. Aggregates still cover all records. Offset pagination is not a snapshot: concurrent inserts/deletes can shift pages. Refresh resets the loaded list.
CRM search applies to loaded records (labelled in the input); load additional pages to search more. The deal customer selector fetches all customer pages when opened. Global server search and virtualized selectors are not implemented.

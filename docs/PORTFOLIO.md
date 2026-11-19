# Портфолио rvrhxg

Шесть самостоятельных учебных MVP с открытым кодом, воспроизводимым запуском и автоматическими проверками. Это демонстрация инженерных решений, не заявление о коммерческом опыте или production-эксплуатации. Данные и пользователи вымышлены, платные услуги и публичный хостинг не подключены.

Основные Python-проекты — Atelier, Deskline и Ledger. Relay и Contour дополняют портфолио fullstack-разработкой на Node.js.

| Проект | Реализованный сценарий | Стек | Код и скриншоты |
|---|---|---|---|
| Relay HelpDesk | Обращения, роли, ответы, статусы, аудит, SLA и аналитика | Node.js24 / SQLite / REST | [Код](https://github.com/rvrhxg/-helpdesk-system) · [Экраны](https://github.com/rvrhxg/-helpdesk-system/tree/main/docs/screenshots) |
| Contour CRM | Клиенты, сделки, воронка, задачи и заметки | Node.js24 / SQLite / REST | [Код](https://github.com/rvrhxg/business-crm) · [Экраны](https://github.com/rvrhxg/business-crm/tree/main/docs/screenshots) |
| Atelier Commerce | Поиск и фильтры на сервере, cursor-каталог, постоянная корзина, атомарная очистка при заказе и история заказов | Python / FastAPI / SQLAlchemy / Alembic / PostgreSQL | [Код](https://github.com/rvrhxg/E-commerce-Platform) · [Экраны](https://github.com/rvrhxg/E-commerce-Platform/tree/main/docs/screenshots) |
| Deskline | Запись на услуги, сотрудники, независимые расписания и защита пересечений | Python / aiogram / FastAPI / SQLite | [Код](https://github.com/rvrhxg/Telegram-Business-Bot) · [Экраны](https://github.com/rvrhxg/Telegram-Business-Bot/tree/main/docs/screenshots) |
| Ledger Finance | Операции, бюджеты, SQL-агрегации, сравнение периодов и CSV | Python / FastAPI / SQLAlchemy / Alembic / PostgreSQL / pandas | [Код](https://github.com/rvrhxg/Finance-Dashboard) · [Экраны](https://github.com/rvrhxg/Finance-Dashboard/tree/main/docs/screenshots) |

## API Health Monitor

[Отдельная учебная CLI-утилита](https://github.com/rvrhxg/API-Health-Monitor): HTTP-доступность, длительность ответа, тайм-ауты, повторы, безопасные JSON-логи и CSV. Без сторонних runtime-зависимостей. 23 pytest-теста и локальное демо сбоя/восстановления проверены на Python 3.12–3.14: [CI44502702068](https://github.com/rvrhxg/API-Health-Monitor/actions/runs/44502702068). Запуск из отдельного репозитория: `python health_monitor.py --demo --csv demo.csv`; код1 ожидаем для намеренного сбоя. Нет фонового планировщика/уведомлений. Команды установки requirements.lock ниже относятся только к Atelier, Deskline и Ledger.

Новые проверки: [корзина Atelier](https://github.com/rvrhxg/E-commerce-Platform/actions/runs/44296016413), [SLA HelpDesk](https://github.com/rvrhxg/-helpdesk-system/actions/runs/44501327397). Снимки корзины защищают очистку от параллельных изменений; редактирование остаётся last-write-wins. SLA — календарные часы без пауз и рабочих расписаний.

## Видеодемонстрации

Реальные записи экрана Chromium с вымышленными данными, без звука. Сценарии воспроизводятся Playwright; действия замедлены для читаемости. Это не макеты и не запись работающего публичного сервиса.

- [Atelier: витрина, аккаунт, корзина и заказ](https://github.com/rvrhxg/E-commerce-Platform/tree/main/docs/demo).
- [Deskline: сотрудник, слот, фильтр расписания и завершение записи](https://github.com/rvrhxg/Telegram-Business-Bot/tree/main/docs/demo). Показана административная панель, не живая Telegram-доставка.
- [Ledger: отчёт, сравнение, CSV и операции](https://github.com/rvrhxg/Finance-Dashboard/tree/main/docs/demo).

В каждой папке находятся WebM, обзорные кадры и метаданные длительности/разрешения/хеша. Происхождение и проверенный CI указаны рядом с записью.

![Ledger desktop](https://raw.githubusercontent.com/rvrhxg/Finance-Dashboard/main/docs/screenshots/dashboard-desktop.png)

## Запуск

Каждый репозиторий самостоятелен. Выполняйте команды из его корня. Для Python создайте отдельное окружение `python -m venv .venv`, активируйте его и установите `python -m pip install -r requirements.lock`. Windows: `.venv\Scripts\python.exe`, Linux/macOS: `.venv/bin/python`. Требуется Python3.12–3.14; Docker использует3.14. Локальные быстрые сценарии работают с SQLite; Compose Atelier/Ledger — с PostgreSQL17.

| Проект | Подготовка новой базы и запуск | Адрес | Тесты |
|---|---|---|---|
| Relay | `npm start`, зарегистрироваться; сотрудник создаётся CLI из README | http://localhost:3000 | `npm test` |
| Contour | `npm start`, зарегистрироваться | http://localhost:3001 | `npm test` |
| Atelier | `python -m alembic upgrade head`, `python -m app.seed --catalog`, затем команда сервера ниже | http://localhost:8000 | `pytest -q` |
| Deskline | `python -m app.setup --admin-email admin@example.test --demo`, затем команда сервера ниже | http://localhost:8001 | `pytest -q` |
| Ledger | `python -m alembic upgrade head`, `python -m app.seed --email demo@example.test`, затем команда сервера ниже | http://localhost:8002 | `pytest -q` |

Сервер Atelier: `uvicorn app.main:create_app --factory --no-access-log --host 127.0.0.1 --port 8000`. Deskline: `uvicorn app.api:create_app --factory --no-access-log --host 127.0.0.1 --port 8001`. Ledger: `uvicorn app.main:create_app --factory --no-access-log --host 127.0.0.1 --port 8002`.

APP_ORIGIN должен совпадать с адресом браузера. По умолчанию используется http://localhost с портом соответствующего проекта. Для изменения: PowerShell `$env:APP_ORIGIN='http://localhost:8002'`; POSIX `export APP_ORIGIN=http://localhost:8002`. Seed запрашивает пароль локально через getpass; общих встроенных паролей нет. Демо не перезаписывает существующие аккаунты/каталог.

Для прежней базы Atelier/Ledger сначала прочитайте docs/MIGRATIONS.md: нужна резервная копия, сверка схемы и stamp0001. Автоматически маркировать произвольную базу нельзя. Deskline переносит исходную схему на расписания сотрудников с сохранением ID; порядок обновления описан в docs/STAFF.md.

Docker: установите Engine/Desktop с Compose. В Atelier/Ledger создайте исключённый из Git .env с собственным POSTGRES_PASSWORD по README, затем `docker compose up --build -d`. Seed запускается внутри store (Atelier) или dashboard (Ledger/Deskline). Остановка с сохранением данных — `docker compose down`; `down -v` удаляет тома. Все демонстрации рассчитаны на отдельное локальное окружение без пользовательского трафика.

Deskline по умолчанию поднимает только панель. Polling включается отдельным профилем с BOT_TOKEN в локальном окружении. Токен не передаётся в чат и не публикуется. Живая доставка Telegram и polling не проверены: тесты используют реальный Dispatcher с перехватом транспорта.

## Доказательства проверок

| Python-проект | Проверенный эксплуатационный CI | Область |
|---|---|---|
| Atelier | [43929968154](https://github.com/rvrhxg/E-commerce-Platform/actions/runs/43929968154), d361533 | Python3.12/3.13/3.14 с PostgreSQL; миграции, авторизация, курсоры, гонка за остаток, dump/restore; Docker и Chromium |
| Deskline | [43930043895](https://github.com/rvrhxg/Telegram-Business-Bot/actions/runs/43930043895), c1ec3e7 | Python3.12/3.13/3.14 с SQLite; сотрудники, интервалы и конкурентная запись; контейнерный backup/restore и Chromium |
| Ledger | [43930004510](https://github.com/rvrhxg/Finance-Dashboard/actions/runs/43930004510), 5d63c21 | Python3.12/3.13/3.14 с PostgreSQL; версии схемы, точные SQL-суммы/сравнение/владельцы, dump/restore; Docker и Chromium |

Atelier/Ledger проверяют PostgreSQL во всех трёх версиях Python. Docker/browser job использует3.14. Локально установлен3.14; Docker и Chromium выполнялись в Linux CI. Результаты и коммиты следующих изменений записываются в docs/ACCEPTANCE.md. Видеодемонстрации имеют собственные CI-ссылки в docs/demo/README.md.

Ruff E9/F проверяет app/tests/scripts. Строгий mypy охватывает указанные в pyproject.toml типизированные модули курсоров/периодов/интервалов, логирования и backup; полная типизация всего backend не заявляется. Для запуска качества установите requirements-quality.txt, если он есть, и используйте `python -m ruff check app tests scripts`, `python -m mypy`.

Readiness возвращает200/503 без внутренних деталей; JSON HTTP-логи исключают URL/query/body/cookies/личность. SQLite-тесты проверяют WAL-снимок, restore, внешние ключи, повреждённый источник и запрет перезаписи. PostgreSQL-тесты восстанавливают dump в отдельную пустую базу и проверяют BigInteger/связи и отказ непустой цели. Процедуры и пределы этих доказательств — в docs/OPERATIONS.md.

Relay и Contour также прошли проверки домена/прав, Docker persistence и Chromium; доказательства указаны в их docs/ACCEPTANCE.md. Новые Python-возможности на Node-проекты не распространяются.

## Границы MVP

Нет реальных платежей, банковских интеграций, восстановления пароля, распределённого limiter и подтверждённых нагрузочных гарантий. Списки Contour ограничены200, список операций Ledger —500; агрегаты Ledger считаются SQL по всему выбранному периоду. Курсор Atelier фиксирует верхний ID, но не замораживает изменения товаров; история заказов сохраняет offset. Сравнение Ledger не обещает единый snapshot между запросами. Deskline не реализует отпуска/перерывы/перевод записи сотруднику.

Backups содержат чувствительные данные и не публикуются. Шифрование/ротация/offsite/PITR, аварийные RPO/RTO и внешний аудит безопасности не проверены. Зелёный CI подтверждает конкретные сценарии на конкретном коммите, а не production-готовность.

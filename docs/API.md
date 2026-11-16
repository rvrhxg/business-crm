# REST API

Все тела — JSON. Изменяющие запросы требуют Content-Type application/json и Origin, точно совпадающий с APP_ORIGIN (локально http://localhost:3001). Авторизация cookie session, HttpOnly/SameSite=Strict; production добавляет Secure и требует HTTPS.

| Метод | Путь | Тело / результат |
|---|---|---|
| POST | /api/auth/register | email, name, password (12–128 символов) |
| POST | /api/auth/login | email, password |
| POST | /api/auth/logout | Отзыв текущей сессии |
| GET | /api/auth/me | Текущий профиль |
| GET/POST | /api/customers | Создание: name, company?, email?, phone? |
| PATCH | /api/customers/:id | Частичное изменение name/company/email/phone своего клиента |
| GET/POST | /api/deals | Создание: customer_id, title, amount_cents |
| GET | /api/deals?stage=proposal | Последние 200 сделок выбранного этапа |
| GET/PATCH | /api/deals/:id | Смена этапа: stage |
| GET/POST | /api/deals/:id/activities | Заметка: body |
| GET/POST | /api/deals/:id/tasks | Задача: title, due_date (YYYY-MM-DD) |
| PATCH | /api/tasks/:id | done: true/false |
| GET | /api/stats | count и amount_cents по этапу, вся база владельца |
| GET | /api/health | HTTP liveness |

Этапы: lead, qualified, proposal, won, lost. Won/lost терминальные. Ошибки: JSON error и HTTP 400/401/403/404/409/413/415/429/503. Чужой объект возвращает 404. Любой ID клиента сделки проверяется на принадлежность текущему пользователю. Денежные суммы — целые копейки от 0 до 100000000000; дробные значения отвергаются.

Списки клиентов и сделок пока ограничены 200 последними записями. Создание сделки требует целочисленный customer_id. При заполнении email контакта проверяется его формат. Удаление контактов не поддерживается, чтобы не терять связанные сделки. API и документация описывают реализованное поведение, а не обещают полный набор функций зрелой CRM.

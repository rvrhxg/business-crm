import {chromium} from 'playwright';
import {openDatabase} from '../src/database.js';import {createApp} from '../src/server.js';
import {once} from 'node:events';import {mkdir} from 'node:fs/promises';import assert from 'node:assert/strict';
const db=openDatabase(':memory:'),server=createApp({db,origin:'http://127.0.0.1:3001'});
server.listen(3001,'127.0.0.1');await once(server,'listening');let browser;
try{
 browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3001');await page.getByRole('button',{name:'Создать аккаунт'}).click();
 await page.getByLabel('Имя',{exact:true}).fill('Анна Волкова');await page.getByLabel('Email',{exact:true}).fill('demo@example.test');await page.getByLabel('Пароль',{exact:true}).fill('isolated-crm-demo-password');await page.getByRole('button',{name:'Продолжить'}).click();await page.locator('#workspace').waitFor({state:'visible'});
 await page.getByRole('button',{name:'+ Клиент',exact:true}).click();await page.getByLabel('Имя',{exact:true}).fill('Алексей Морозов');await page.getByLabel('Компания',{exact:true}).fill('Северная студия');await page.getByRole('button',{name:'Сохранить',exact:true}).click();await page.locator('#editor').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'+ Сделка',exact:true}).click();await page.getByLabel('Название',{exact:true}).fill('Разработка клиентского портала');await page.getByLabel('Сумма, ₽',{exact:true}).fill('125000,50');await page.getByRole('button',{name:'Сохранить',exact:true}).click();await page.locator('#editor').waitFor({state:'hidden'});
 await page.getByRole('button',{name:/Разработка клиентского портала/}).click();await page.getByLabel('Новая заметка').fill('Требования согласованы с клиентом.');await page.locator('.card').filter({has:page.getByRole('heading',{name:'История',exact:true})}).getByRole('button',{name:'Добавить'}).click();await page.getByText('Требования согласованы с клиентом.',{exact:true}).waitFor();
 await page.getByLabel('Новая задача').fill('Отправить предложение');await page.getByLabel('Срок',{exact:true}).fill('2026-12-01');await page.locator('.card').filter({has:page.getByRole('heading',{name:'Задачи',exact:true})}).getByRole('button',{name:'Добавить'}).click();await page.getByRole('button',{name:'Выполнить',exact:true}).click();await page.getByText('✓ Отправить предложение · 2026-12-01',{exact:true}).waitFor();
 await page.getByLabel('Этап сделки').selectOption('proposal');await page.getByText('Stage: lead → proposal',{exact:true}).waitFor();
 await mkdir('screenshots',{recursive:true});await page.screenshot({path:'screenshots/deal-desktop.png',fullPage:true});await page.getByRole('button',{name:'← Воронка',exact:true}).click();await page.locator('#workspace').waitFor({state:'visible'});await page.screenshot({path:'screenshots/pipeline-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'screenshots/pipeline-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
 console.log('CRM Chromium register/customer/deal/note/task/stage scenario passed.');
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));db.close();}

#!/usr/bin/env node
/**
 * DEPRECATED / READ-ONLY.
 *
 * Склейка Latin-дублей групп (/DE→/de и т.п.) БОЛЬШЕ НЕ ПРИМЕНЯЕТСЯ.
 * Дубли с разным регистром на контурах не трогаем.
 *
 * Этот файл оставлен только как справочник путей. Любой --apply завершится ошибкой.
 *
 * Для ролей F-05 используйте:
 *   node scripts/keycloak-remap-anketa-group-roles.mjs [--apply]
 */
console.error(`
[keycloak-merge-case-duplicate-groups] ОТКЛЮЧЕНО.

Дубли групп с разным регистром (/DE vs /de, /MIPM vs /mipm, …) не удаляем и не склеиваем.
Правьте только realm-role mappings через keycloak-remap-anketa-group-roles.mjs
(канонические lowercase path из TARGET).
`);
process.exit(1);

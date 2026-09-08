import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import * as schema from '../db/schema.ts';
// Native Node TypeScript support avoids the CLI's OS username lookup on restricted Windows hosts.
const directory = new URL('../drizzle/', import.meta.url);
const meta = new URL('meta/', directory);
mkdirSync(meta, { recursive:true });
const journalPath = new URL('_journal.json', meta);
const journal = existsSync(journalPath) ? JSON.parse(readFileSync(journalPath,'utf8')) : {version:'7',dialect:'sqlite',entries:[]};
const index = journal.entries.length;
const previous = index ? JSON.parse(readFileSync(new URL(String(index-1).padStart(4,'0')+'_snapshot.json',meta),'utf8')) : await generateSQLiteDrizzleJson({});
if (!index) previous.id = '00000000-0000-0000-0000-000000000000';
const current = await generateSQLiteDrizzleJson(schema, previous.id);
const statements = await generateSQLiteMigration(previous,current);
if (!statements.length) {console.log('No schema changes.');process.exit(0);}
const prefix=String(index).padStart(4,'0'),tag=prefix+'_feed_cache';
writeFileSync(new URL(tag+'.sql',directory),statements.join('\n--> statement-breakpoint\n')+'\n');
writeFileSync(new URL(prefix+'_snapshot.json',meta),JSON.stringify(current,null,2)+'\n');
journal.entries.push({idx:index,version:current.version,when:Date.now(),tag,breakpoints:true});
writeFileSync(journalPath,JSON.stringify(journal,null,2)+'\n');
console.log('Generated '+tag+'.sql');

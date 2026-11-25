import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateExperimentResults} from './validate-experiments.mjs';
const record=JSON.parse(fs.readFileSync('data/behavioral-experiments-v2.json','utf8'));
const profiles=JSON.parse(fs.readFileSync('data/biographies-research.json','utf8')).profiles;
const copy=x=>structuredClone(x);
test('linked experiment passes referential checks',()=>{
 const v=validateExperimentResults(record,profiles);
 assert.equal(v.checkedExcerpts,2);
});
test('changed quotation breaks SHA256 integrity',()=>{
 const p=copy(profiles);
 p[record.subject].speechSamples[0].text+=' extra';
 assert.throws(()=>validateExperimentResults(record,p),/hash mismatch/);
});
test('wrong source, dates and duplicate samples fail',()=>{
 const wrong=copy(record);wrong.results[0].url='https://example.org/mismatch';
 assert.throws(()=>validateExperimentResults(wrong,profiles),/not linked/);
 const duplicate=copy(record);duplicate.results[1]=copy(duplicate.results[0]);
 assert.throws(()=>validateExperimentResults(duplicate,profiles),/Duplicate/);
});
test('fake model execution provenance and invalid scores fail',()=>{
 const fake=copy(record);fake.models[2].executed=true;
 assert.throws(()=>validateExperimentResults(fake,profiles),/model provenance/);
 const invalid=copy(record);invalid.results[0].polarity=4;
 assert.throws(()=>validateExperimentResults(invalid,profiles),/out of range/);
});

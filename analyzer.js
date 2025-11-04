import {Data, Stat, Damage} from '/calculation.js'
import {Menu, DB} from '/UIX.js'
import Form from './form.js'
import CharForm from './form-char.js'
import BuffForm from './form-buff.js'
import RuneForm from './form-rune.js'
import EnemyForm from './form-enemy.js'
import {Helper} from './help.js'
class Analyzer extends HTMLElement {
    constructor(saved) {
        super();
        this.attachShadow({mode: 'open'}).append(...Analyzer.DOM(saved));
        this.saved = saved ? (({CharForm, BuffForm, RuneForm, ...others}) => others)(saved) : false;
    }
    connectedCallback() {
        Analyzer.forms.forEach(f => this[f] = this.sQ(f.replace(/[A-Z]/, c => `-${c.toLowerCase()}`)));
        this.el = this.ref();
        this.events();
        this.saved && this.fill();
        this.el.name.style.background = this.el.color.value;
        this.mode = 'rune';
        this.switchMode([this.buffForm, this.charForm], Analyzer.modes);
        this.calculate();
    }
    events() {
        Data.observe(this.shadowRoot);
        this.sQ('#toggle-mode').oninput = ev => {
            this.mode = ev.target.checked ? 'diff' : 'rune';
            this.switchMode([this.buffForm, this.charForm], Analyzer.modes);
            this.buffForm.reset();
            let details = this.runeForm.parentElement;
            details.classList.toggle('disabled', ev.target.checked);
            if (this.mode == 'diff') {
                details.open = false;
                this.buffForm.take([details.Q('img:has(~i)') ?? []].flat().map(img => img.alt));
            }
            this.calculate();
        }
        this.sQ('div:has([name=skill]').onchange = ev => {
            if (!ev.target.checked) return;
            this.switchMode(this.buffForm, ['normal', 'sp13', 'sp4', 'spA'], ev.target.value);
            this.calculate();
        }
        Object.assign(this.sQ('#pref'), {
            onchange: ev => {
                this.el.name.style.background = ev.target.value;
                Menu.arrange();
                this.save();
            },
            onclick: ({target: {id}}) => id == 'delete' ? this.delete() : id == 'scroll' ? scrollTo(0,0) : null,
        });
        this.addEventListener('calculate', () => [this.calculate(), this.save()]);
        this.addEventListener('request', ({detail}) => detail.action(detail.el ? this[detail.el] : this));
        this.addEventListener('help', ({detail}) => dispatchEvent(new CustomEvent('help', {detail})));
        Helper.cursor(this.shadowRoot);
        Helper.event(this.shadowRoot);
    }
    calculate() {setTimeout(() => {
        let enemy = this.enemyForm.give();
        this.buffForm.take(enemy.settings);
        let {setup, buffs} = this.buffForm.give();
        let {before, diff} = this.charForm.give(), after;
        let add = (which, ...buffs) => ({...buffs[0], A: buffs[0].A + buffs[1][which].A, HS: buffs[0].HS + buffs[1][which].HS})

        if (this.mode == 'rune') {
            let runes = this.runeForm.give();
            let eachDiffTA = this.charForm.calculate(runes.diffs ?? []);
            this.runeForm.take(eachDiffTA); 
            this.charForm.take(new Stat().add(...runes.diffs ?? []));
            
            after = before.add(...runes.diffs ?? []);
            buffs = {
                before: add('before', buffs, runes.buffs), 
                after: add('after', buffs, runes.buffs)
            };
        } else {
            after = before.add(diff);
            this.charForm.output({before: before.TA, after: after.TA});
        }
        this.present(buffs.before.A, buffs.after.A, enemy, setup.TD);

        let type = this.sQ('input[name=skill]:checked').value;
        before = Damage({...before, ...setup, buffs: buffs.before}, enemy, type);
        after = Damage({...after, ...setup, buffs: buffs.after}, enemy, type);
        this.el.ul.classList = after.at(-1);
        Form.output(this.el.damages, {before, after}); });
    }
    present (before, after, def, TD) {
        Array.isArray(before) ? this.presentSets(before, after) : Form.presentDiff(this.el.present, {before, after}, true);
        this.el.summary.enemy.style.color = def?.SD || def?.HSD || def?.NHSAD || def?.HSAD ? 'violet' : 'inherit';
        this.sQ('img[alt=TD]').hidden = TD == 0;
    }
    presentSets (before, after) {
        let img = s => E(`img${['hunt','rage','punish'].includes(s) ? '.conditional' : ''}`, {src: `/rune/set/${s}.webp`});
        this.el.summary.rune.replaceChildren(...before.map(img), E('i', '⟶'), ...after.map(img));
        Helper.cursor(this.shadowRoot, '.conditional');
    }
    save () {setTimeout(() => {
        let content = {
            name: this.el.name.value,
            color: this.el.color.value,
        };
        content = {...new O(content, ...Analyzer.forms.map(f => f == 'enemyForm' ? {} : this[f].save()))};
        DB.put('characters', this.id ? [parseInt(this.id), content] : content)
            .then(ev => this.id = ev.target.result).catch(er => Q('header p').textContent = er);
    })}
    fill () {
        new O(this.saved).each(([item, value]) => item == 'id' ? this.id = value : this.el[item].value = value);
        Menu.arrange();
    }
    delete () {
        (this.id ? DB.delete('characters', parseInt(this.id)) : Promise.resolve()).then(() => this.remove());
    }
    switchMode = (els, from, to = this.mode) => [els].flat().forEach(el => {
        el.classList.remove(...from);
        el.classList.add(to);
        Analyzer.modes.includes(to) && (el.mode = to);
    });
    static modes = ['diff', 'rune'];
    static DOM = (saved = {}) => [
        E('link', {rel: 'stylesheet', href: '/common.css'}),
        E('link', {rel: 'stylesheet', href: 'analyzer.css'}),
        E('form#pref', [
            E('button#scroll', {type: 'button'}, '🔝'),
            E('input', {name: 'name'}),
            E('input', {type: 'color', value: '#0000ff'}),
            E('button#delete.action', {type: 'button'}, E.bilingual('Delete', '刪除')),
            ...E.bilingual('Rune', '符文'), 
            E.checkbox({id: 'toggle-mode'}),
            ...E.bilingual('Diff', '差異')
        ]),
        new CharForm(saved.CharForm),
        E.ul(['', 'HS', 'CAD', 'CAD HS', 'BAD', 'BAD HS', 'BAD CAD', 'BAD CAD HS'].map(props => [
            ...props ? props.split(' ').map(prop => E.icon(prop)) : [], 
            E('output'), E('data.post')
        ])),
        E('div', [
            E.radio({
                label: E.bilingual('Normal attack', '普通攻擊'), 
                value: 'normal', name: 'skill', checked: true
            }),
            ...E.radios(['sp13', 'sp4', 'spA'].map(skill => ({
                label: E.bilingual(BuffForm.buffs.inputs[skill]),
                value: skill, name: 'skill',
            }) )),
            E('h3', [
                ...E.bilingual('Average damage', '平均傷害'), 
                E('output'), E('data.post'),
            ])
        ]),
        E('details', [
            E('summary', [
                ...E.bilingual('Buffs', '增益'), 
                Form.showDiff('damage', true)
            ]), new BuffForm(saved.BuffForm)
        ]),
        E('details', [
            E('summary', [
                ...E.bilingual('Runes', '符文'),
                E('b')
            ]), new RuneForm(saved.RuneForm)
        ]),
        E('details', [
            E('summary', E.bilingual('Enemy (Partial)', '對象（部分）')), 
            new EnemyForm()
        ]),
    ];
    ref = () => ({
        name: this.sQ('[name=name]'),
        color: this.sQ('[type=color]'),
        ul: this.sQ('ul'),
        damages: this.sQ(':is(ul,h3) output'),
        present: this.sQ(`details:has(buff-form) .ante`),
        summary: {
            rune: this.sQ('details:has(rune-form) summary b'),
            enemy: this.sQ(`details:has(enemy-form) summary`)
        }
    })
    static forms = ['charForm', 'buffForm', 'runeForm', 'enemyForm'];
}
Analyzer.add = data => {
    typeof data == 'boolean' && (data = null);
    Q('section').appendChild(new Analyzer(data ?? {}))[data ? null : 'scrollIntoView']?.();
}
Analyzer.delete = checked => Q('power-analyzer', cal => cal.classList.toggle('delete', checked));
customElements.define('power-analyzer', Analyzer);
export default Analyzer
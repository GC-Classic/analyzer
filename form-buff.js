import Form from './form.js'
class BuffForm extends Form {
    constructor(saved) {
        super(saved);
        this.shadowRoot.append(...BuffForm.DOM());
        let section = this.sQ('section');
        section.before(section.cloneNode(true));
        section.previousElementSibling.classList.add('diff');
        section.previousElementSibling.Q('input', input => {
            input.id &&= 'from-' + input.id;
            input.name &&= 'from-' + input.name;
        });
    }
    connectedCallback() {
        super.connectedCallback();
        this.el = this.ref();
        this.events();
        this.classList.add('normal');
    }
    events () {
        BuffForm.observer.observe(this, {attributeFilter: ['class']});
        this.el.coef.onchange = ev => {
            let stored = ev.target.dataset.stored ? JSON.parse(ev.target.dataset.stored) : [0,0,0,0];
            stored[['normal', 'sp13', 'sp4', 'spA'].findIndex(c => this.classList.contains(c))] = ev.target.value;
            ev.target.dataset.stored = JSON.stringify(stored);
        }
        this.el.form.onchange = ev => ev.target.type != 'radio' && this.dispatch('calculate'); 
    }
    reset () {
        this.sQ('[value=after]').checked = true;
        this.sQ('[name=rune],[name=from-rune]', input => input.checked = false);
    }
    unlock () {
        this.el.boss.checked = this.el.enemyLv.value = this.el.TD.value = '';
        this.sQ('.lock', label => label.classList.remove('lock'));
    }
    give () {
        let buffs = {
            before: this.get.stats(this.el.items.before),
            after: this.get.stats(this.el.items.after)
        };
        this.mode == 'diff' && (buffs.before.A += this.sum() + this.numeric('[name=from-damage]'));
        buffs.after.A += this.sum() + (this.mode == 'diff' ? this.sum(true) : 0) + this.numeric('[name=damage]');
        this.present(this.numeric('[name=TD]') > 0, buffs);

        let setup = this.get.values(this.el.setups);
        return {setup, buffs: this.mode == 'diff' ? buffs : buffs.after};
    }
    take (stuff) {
        if (Array.isArray(stuff)) {
            this.el.rune.forEach(input => input.checked = false);
            this.el.sections.forEach(sec => stuff.forEach(set => {
                let input = sec.Q(`label:nth-child(1 of :has([id*=${set}]:not(:checked))) input`);
                input && (input.checked = true);
            }));
        } else {
            new O(stuff).each(([name, value]) => {
                this.el[name].labels[0].classList.add('lock');
                this.el[name][typeof value == 'boolean' ? 'checked' : 'value'] = value;
            });
        }
    }
    sum = (diff) => this.numeric(`[name=${diff ? 'Δ' : ''}attd]`) + 
        (this.el.boss.checked ? this.numeric(`[name=${diff ? 'Δ' : ''}attBoss]`) : 0) + 
        (this.matches('.sp13,.sp4,.spA') ? 
            this.numeric(`[name=${diff ? 'Δ' : ''}sp]`) + this.numeric(`[name=${diff ? 'Δ' : ''}${[...this.classList].find(c => /^sp/.test(c))}]`)
        : 0);
    present (taint, stats) {
        taint &&= {CAC: -20, CAD: -250, BAD: -50};
        stats.before = stats.before.add(taint || {});
        stats.after = stats.after.add(taint || {})
        this.presentDiff(stats, this.mode == 'diff');
    }
    save () {return super.save(':not([name=time],[name*=rune])');}
    static observer = new MutationObserver(([{target}]) => {
        let coef = target.el.coef;
        let stored = coef.dataset.stored && JSON.parse(coef.dataset.stored);
        stored &&= stored[['normal', 'sp13', 'sp4', 'spA'].findIndex(c => target.classList.contains(c))];
        stored && (coef.value = stored);
    });
    static DOM = () => [
        E('form', [
            E.input({
                label: E('a', E.bilingual('Coefficient', '傷害系數'), {
                    href: 'https://docs.google.com/spreadsheets/d/1FGxKHQuwz_Jx-GdYd6647FiAE9UbS6mZgufXor9_DZk', target: '_blank'
                }),
                type: 'number', name: 'coef', 
                classList: 'setup', step: 0.0001, 
                placeholder: 7.575, input: 'last'
            }),
            ...new O(BuffForm.buffs.inputs).flatMap(([name, span]) => [
                E.input({
                    label: E.bilingual(span),
                    type: 'number', name, 
                    classList: /^att|sp/.test(name) ? 'skill' : 'setup',
                    step: name == 'BAP' || name.includes('Lv') ? 1 : 0.01,
                    placeholder: BuffForm.buffs.default[name] ?? 0,
                    input: 'last'
                }),
                /^att|sp/.test(name) ? E('input.formula', {name: `Δ${name}`, placeholder: '='}) : '',
                name == 'attBoss' ? E.checkbox({name: 'boss'}) : ''
            ]),
            E('div.diff', 
                E.radios([
                    {label: E.bilingual('Before', '之前'), name: 'time', value: 'before'}, 
                    {label: E.bilingual('After', '之後'), name: 'time', value: 'after', checked: true}
                ])
            ),
            E('section', [
                ...BuffForm.labelling('title', id => `/analyzer/buffs/${id}.webp`),
                ...BuffForm.labelling('item', id => `/analyzer/buffs/${id}.png`),
                ...BuffForm.labelling('rune', id => `/rune/set/${id.replace(/\d/, '')}.webp`),
                E('b', [
                    E('u', '+', {style: {fontSize: '2em', marginLeft: '.1em'}}),
                    E('input', {type: 'number', name: 'damage', step: 0.01, placeholder: 0, min: -100}), 
                    E('u', '%', {style: {fontSize: '1em'}}),
                ])
            ])
        ]),
        E('div', ['HS', 'CAC'].map(p => Form.showDiff(p))),
        E('div', ['CAD', 'BAD'].flatMap(p => [
            E.icon(p), 
            E('data.ante', {title: p}),
        ]))
    ];
    ref = () => ({
        sections: this.sQ('section'),
        form: this.sQ('form'),
        present: this.sQ('.ante'),
        formulae: this.sQ('.formula'),
        items: {
            before: this.sQ('section:first-of-type :is([type=radio],[type=checkbox])'),
            after: this.sQ('section:last-of-type :is([type=radio],[type=checkbox])')
        },
        setups: this.sQ('label .setup'),
        ...new O(['coef', 'rune', 'boss', 'TD', 'enemyLv', 'Lv'].map(name => [name, this.sQ(`[name=${name}]`)]))
    });
    static labelling = (name, src) => E.checkboxes(new O(BuffForm.buffs[name]).flatMap(([id, value]) => ({
        label: new A(id.includes('-') ? E(`gc-item#${id.split('-')[1]}`) : E('img', {src: src(id)}), {title: value.A || value.HS}),
        id, value: JSON.stringify(value), name
    }) ));
    static buffs = {
        inputs: {
            sp: 'All skill|所有技能',
            sp13: 'Normal skill|普通技能',
            sp4: '4th skill|第 4 技能',
            spA: 'Awaken skill|覺醒技能',
            attd: 'Attack / \'ed|打擊/被擊',
            attBoss: 'To bosses|對 Boss 傷害',
            enemyLv: 'Enemy level|怪物等級',
            Lv: 'Character level|角色等級',
            TD: 'Taint debuff|侵蝕減益',
            BAP: 'Back proportion|背擊佔比'
        },
        default: {
            sp: 20,
            attBoss: 12.5,
            enemyLv: 85,
            Lv: 85,
            BAP: 20,
        },
        rune: {
            fury1:{A:5}, fury2:{A:5}, fight1:{A:2.5}, fight2:{A:2.5},
            hunt:{A:10},
            roar1:{HS:10}, roar2:{HS:10}
        },
        title: {
            t1:{A:10,CAC:1.5}, t2:{A:5,CAC:1.5}, 't-88130':{A:10,CAC:1.5}, 't-80820':{A:5,CAC:1.5}, 't-147392':{A:5,CAC:1.5},
        },
        item: {
            'i-152230':{A:10}, 'i-10465':{A:10}, 'i-14109':{A:10}, 'i-54760':{A:15}, 'i-739':{A:15},
        },
    }
}
customElements.define('buff-form', BuffForm);
export default BuffForm
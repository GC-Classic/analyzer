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
        this.el = {
            sections: this.sQ('section'),
            form: this.sQ('form'),
            coef: this.sQ('[name=coef]'),
            data: this.sQ('data[title]'),
            formulae: this.sQ('.formula'),
            items: {
                before: this.sQ('section:first-of-type :is([type=radio],[type=checkbox])'),
                after: this.sQ('section:last-of-type :is([type=radio],[type=checkbox])')
            },
            setupInputs: this.sQ('label .setup'),
        }
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
        this.el.form.onchange = ev => ev.target.type != 'radio' && this.dispatch();        ;
    }
    give () {
        let buffs = {
            before: this.get.stats(this.el.items.before),
            after: this.get.stats(this.el.items.after)
        };
        this.matches('.diff') && (buffs.before.A += this.sum() + this.numeric('[name=from-damage]'));
        buffs.after.A += this.sum() + (this.matches('.diff') ? this.sum(true) : 0) + this.numeric('[name=damage]');
        this.present(this.numeric('[name=TD]') > 0, buffs);

        let setup = this.get.values(this.el.setupInputs);
        return {setup, buffs: this.matches('.diff') ? buffs : buffs.after};
    }
    take (stuff) {
        if (typeof stuff == 'number')
            return this.sQ('[name=TD]').value = stuff;
        this.sQ('[name=rune]', input => input.checked = false);
        this.el.sections.forEach(sec => stuff.forEach(set =>
            sec.Q(`label:nth-child(1 of :has([id*=${set}]:not(:checked))) input`).checked = true
        ));
    }
    sum = (diff) => this.numeric(`[name=${diff ? 'Δ' : ''}attd]`) + 
        (this.sQ('[name=boss]').checked ? this.numeric(`[name=${diff ? 'Δ' : ''}attBoss]`) : 0) + 
        (this.matches('.sp13,.sp4,.spA') ? 
            this.numeric(`[name=${diff ? 'Δ' : ''}sp]`) + this.numeric(`[name=${diff ? 'Δ' : ''}${[...this.classList].find(c => /^sp/.test(c))}]`)
        : 0);
    present = (taint, stats) => {
        taint && (stats.before = stats.before.add({CAC: -20, CAD: -250, BAD: -50}))
        taint && (stats.after = stats.after.add({CAC: -20, CAD: -250, BAD: -50}))
        this.el.data.forEach(data => data.value = stats[data.classList[0]][data.title]);
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
            E.input([
                E('a', E.bilingual('Coefficient', '傷害系數'),
                {href: 'https://docs.google.com/spreadsheets/d/1FGxKHQuwz_Jx-GdYd6647FiAE9UbS6mZgufXor9_DZk', target: '_blank'}),
            ], {
                type: 'number', name: 'coef', 
                classList: 'setup', step: 0.0001, 
                placeholder: 7.575, input: 'last'
            }),
            ...Object.entries(BuffForm.buffs.inputs).flatMap(([name, span]) => [
                E.input(E.bilingual(span), {
                    type: 'number', name, 
                    classList: /^att|sp/.test(name) ? 'skill' : 'setup',
                    step: name == 'BAP' || name.includes('Lv') ? 1 : 0.01,
                    placeholder: name == 'BAP' ? 20 : name.includes('Lv') ? 85 : name == 'attBoss' ? 12.5 : 0,
                    input: 'last'
                }),
                /^att|sp/.test(name) ? E('input', {classList: 'formula', name: `Δ${name}`, placeholder: '='}) : '',
                name == 'attBoss' ? E.checkbox({name: 'boss'}) : ''
            ]),
            E('div', {classList: 'diff'}, 
                E.radios([
                    {children: E.bilingual('Before', '之前'), value: 'before'}, 
                    {children: E.bilingual('After', '之後'), value: 'after', checked: true}
                ], {name: 'time'})
            ),
            E('section', [
                ...BuffForm.labelling('title', id => `/analyzer/buffs/${id}.webp`),
                ...BuffForm.labelling('item', id => `/analyzer/buffs/${id}.png`),
                ...BuffForm.labelling('rune', id => `/rune/set/${id.replace(/\d/, '')}.webp`),
                E('b', [
                    E('i', '+', {style: {fontSize: '2em'}}),
                    E('input', {type: 'number', name: 'damage', step: 0.01, placeholder: 0, min: -100}), 
                    E('i', '%', {style: {fontSize: '1em'}}),
                ])
            ])
        ]),
        E('div', ['HS', 'CAC'].map(p => Form.showDiff(p))),
        E('div', ['CAD', 'BAD'].flatMap(p => [
            E.prop(p), 
            E('data', {classList: `after boost`, title: p}),
        ]))
    ];
    static labelling = (name, src) => E.checkboxes(Object.entries(BuffForm.buffs[name]).map(([id, value]) => ({
        id, value: JSON.stringify(value), title: value.A || value.HS,
        children: E('img', {src: src(id)})
    })), {name});
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
        rune: {
            fury1:{A:5}, fury2:{A:5}, fight1:{A:2.5}, fight2:{A:2.5},
            roar1:{HS:10}, roar2:{HS:10}
        },
        title: {
            t1:{A:10,CAC:1.5}, t2:{A:5,CAC:1.5}, t3:{A:10,CAC:1.5}, t4:{A:5,CAC:1.5}, t5:{A:5,CAC:1.5},
        },
        item: {
            i1:{A:10}, i2:{A:10}, i3:{A:10}, i4:{A:15}, i5:{A:15},
        },
    }
}
customElements.define('buff-form', BuffForm);
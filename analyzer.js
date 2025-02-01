class Analyzer extends HTMLElement {
    constructor(saved) {
        super();
        this.attachShadow({mode: 'open'}).append(...Analyzer.DOM(saved));
        this.saved = saved ? (({CharForm, BuffForm, RuneForm, ...others}) => others)(saved) : false;
    }
    connectedCallback() {
        this.el = {
            name: this.sQ('[name=name]'),
            color: this.sQ('[type=color]'),
            char: this.sQ('char-form'),
            buffs: this.sQ('buff-form'),
            runes: this.sQ('rune-form'),
            enemy: this.sQ('enemy-form'),
            damages: this.sQ(':is(ul,h3) output'),
            damage_diffs: this.sQ(':is(ul,h3) data'),
            summary: {
                rune: this.sQ('details:has(rune-form) summary b'),
                buff: this.sQ(`details:has(buff-form) data`),
                enemy: this.sQ(`details:has(enemy-form) prop-icon`)
            }
        };
        this.events();
        this.saved && this.fill();
        this.el.name.style.background = this.el.color.value;
        this.switchMode([this.el.buffs, this.el.char], ['diff', 'rune'], this.mode = 'rune');
        this.calculate();
    }
    events() {
        Data.observe(this.shadowRoot);
        this.sQ('#toggle-mode').oninput = ev => {
            this.mode = ev.target.checked ? 'diff' : 'rune';
            this.switchMode([this.el.buffs, this.el.char], ['diff', 'rune'], this.mode);
            let details = this.el.runes.parentElement;
            details.classList.toggle('disabled', ev.target.checked);
            if (this.mode == 'diff') {
                details.open = false;
                this.el.buffs.take([details.Q('img:has(~i)') ?? []].flat().map(img => img.alt));
                this.el.buffs.sQ('[value=after]').checked = true;
            } else {
                this.el.buffs.Q('[name=rune]', input => input.checked = false);
            }
            this.calculate();
        }
        this.sQ('div:has([name=skill]').onchange = ev => {
            if (!ev.target.checked) return;
            this.switchMode(this.el.buffs, ['normal', 'sp13', 'sp4', 'spA'], ev.target.value);
            this.calculate();
        }
        this.addEventListener('calculate', () => {
            this.calculate();
            this.save();
        });
        this.addEventListener('help', ({detail}) => dispatchEvent(new CustomEvent('help', {detail})));
        Object.assign(this.sQ('#pref'), {
            onchange: ev => {
                this.el.name.style.background = ev.target.value;
                Menu.arrange();
                this.save();
            },
            onclick: ({target: {id}}) => id == 'delete' ? this.delete() : id == 'scroll' ? scrollTo(0,0) : null,
        });
        Help.cursor(this.shadowRoot);
        Help.event(this.shadowRoot);
    }
    calculate() {setTimeout(() => {console.log('cal');
        let enemy = this.el.enemy.give();
        enemy.TD >= 0 && this.el.buffs.take(enemy.TD);
        let {setup, buffs} = this.el.buffs.give();
        let {before, diff} = this.el.char.give(this.mode), after;
        let add = (which, ...buffs) => ({...buffs[0], A: buffs[0].A + buffs[1][which].A, HS: buffs[0].HS + buffs[1][which].HS})

        if (this.mode == 'rune') {
            let runes = this.el.runes.give();
            let eachDiffTA = this.el.char.calculate(runes.diffs ?? []);
            this.el.runes.take(eachDiffTA); 
            this.el.char.take(new Stats().add(...runes.diffs ?? []));
            
            after = before.add(...runes.diffs ?? []);
            buffs = {
                before: add('before', buffs, runes.buffs), 
                after: add('after', buffs, runes.buffs)
            };
        } else {
            after = before.add(diff);
            this.el.char.present(before, after);
        }
        this.present(buffs.before.A, buffs.after.A, enemy, setup.TD);

        let type = this.sQ('input[name=skill]:checked').value;
        before = Damage({...before, ...setup, buffs: buffs.before}, enemy, type);
        after = Damage({...after, ...setup, buffs: buffs.after}, enemy, type);
        after.forEach((value, i) => {
            this.el.damages[i].value = value ? value.toFixed(0) : null;
            this.el.damage_diffs[i].value = value ? (value - before[i]).toFixed(0) : null;
        }); });
    }
    present (before, after, def, TD) {
        if (Array.isArray(before)) {
            this.el.summary.rune.replaceChildren(
                ...before.map(s => E('img', {src: `/rune/set/${s}.webp`})),
                E('i', '⟶'),
                ...after.map(s => E('img', {src: `/rune/set/${s}.webp`})),
            );
        } else {
            this.el.summary.buff.forEach((data, i) => data.value = [before, after][i]);
        }
        this.el.summary.enemy.hidden = !(def?.SD || def?.HSD || def?.NHSAD || def?.HSAD);
        this.sQ('img[alt=TD]').hidden = TD == 0;
    }
    save () {setTimeout(() => {console.log('save');
        let content = {
            name: this.el.name.value,
            color: this.el.color.value,
        };
        content = ['char', 'buffs', 'runes'].reduce((obj, form) => ({...obj, ...this.el[form].save()}), content);
        DB.put('characters', this.id ? [parseInt(this.id), content] : content)
            .then(ev => this.id = ev.target.result).catch(er => Q('header p').textContent = er);
    })}
    fill () {
        Object.entries(this.saved).forEach(([item, value]) => item == 'id' ? this.id = value : this.el[item].value = value);
        Menu.arrange();
    }
    delete () {
        (this.id ? DB.delete('characters', parseInt(this.id)) : Promise.resolve()).then(() => this.remove());
    }
    switchMode = (els, from, to) => [els].flat().forEach(el => (el.classList.remove(...from), el.classList.add(to)));
    static DOM = (saved = {}) => [
        E('link', {rel: 'stylesheet', href: '/common.css'}),
        E('link', {rel: 'stylesheet', href: 'analyzer.css'}),
        E('form', {id: 'pref'}, [
            E('button', {type: 'button', classList: 'action', id: 'delete'}, E.bilingual('Delete', '刪除')),
            E('button', {type: 'button', id: 'scroll'}, '🔝'),
            E('input', {name: 'name'}),
            E('input', {type: 'color', value: '#0000ff'}),
            ...E.bilingual('Rune', '符文'), 
            E.checkbox({id: 'toggle-mode'}),
            ...E.bilingual('Diff', '差異')
        ]),
        new CharForm(saved.CharForm),
        E('ul', [...['', 'HS', 'CAD', 'CAD HS', 'BAD', 'BAD HS', 'BAD CAD', 'BAD CAD HS'].map(props => 
            E('li', [
                ...props ? props.split(' ').map(prop => E.prop(prop)) : [], 
                E('output'), E('data', {classList: 'delta'})
            ])),
        ]),
        E('div', [
            E.radio(
                E.bilingual('Normal attack', '普通攻擊'), 
                {value: 'normal', name: 'skill', checked: true}
            ),
            ...E.radios(['sp13', 'sp4', 'spA'].map(skill => ({
                value: skill, 
                children: E.bilingual(BuffForm.buffs.inputs[skill])
            }) ), {name: 'skill'}),
            E('h3', [
                ...E.bilingual('Average damage', '平均傷害'), 
                E('output'), E('data', {classList: 'delta'}),
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
            E('summary', [
                ...E.bilingual('Enemy (Partial)', '對象（部分）'),
                E('b', [E.prop('D')]),
            ]), E('enemy-form')]),
    ];
}
Analyzer.add = data => {
    typeof data == 'boolean' && (data = null);
    Q('section').appendChild(new Analyzer(data ?? {}))[data ? null : 'scrollIntoView']?.();
}
Analyzer.delete = checked => Q('power-analyzer', cal => cal.classList.toggle('delete', checked));
customElements.define('power-analyzer', Analyzer);

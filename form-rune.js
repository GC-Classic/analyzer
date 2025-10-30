import {Rune, Runes} from '/rune/rune.js'
import RuneElement from '/rune/rune-element.js'
import {Stat} from '/calculation.js'
import Form from './form.js'
import {Picker} from './help.js';
class RuneForm extends Form {
    constructor(saved) {
        super(saved);
        saved === undefined && (this.sample = true);
        this.shadowRoot.append(...RuneForm.DOM());
    }
    connectedCallback () {
        super.connectedCallback();
        this.el = this.ref();
        this.events();
        this.sample ? this.randomize() : this.switchOff();
    }            
    events () {
        this.el.form.onchange = ev => {
            if (ev.target.type == 'radio') return Picker.aside.classList.remove('remind');
            ['text', 'select-one'].includes(ev.target.type) && this.changeRune(ev.target);
            this.dispatch('calculate');
        }
        this.el.form.onclick = ev => ev.stopPropagation();
        this.el.runes.strings.forEach(input => input.onfocus = ev => Picker.set(ev));
    }
    randomize () {
        this.el.runes.switches.forEach(input => input.checked = true);
        this.el.runes.strings.forEach(input => {
            input.value = new Rune([input.id.split('-')[1]]).stringify().replace(/^\[.\]/, '');
            this.changeRune(input, true);
        });
    }
    switchOff () {
        this.el.runes.after.forEach((input, i) => !input.value && (this.el.runes.switches[i].checked = false));
    }
    changeRune (target, sample) {
        let [input, slot, select] = target.type == 'select-one' ?
            [target.previousSibling, target.previousSibling.labels[0], target] :
            [target, target.labels[0], target.closest('div').Q('select')];

        if (select) {
            target == select && (input.value = select.value);
            input.value ? select.prepend(select.selectedOptions[0]) : select.options[select.selectedIndex]?.remove();
            input.value ||= select.options[0]?.value || '';
        }
        if (!input.value)
            return slot.replaceChildren();

        let rune = RuneForm.parse(input, input.id.split('-')[1]);
        if (!rune) return;
        slot.replaceChildren(new RuneElement(rune));

        input.value = rune = rune.stringify().replace(/^\[.\]/, '').replace(/[(){},]/g, ' $& ');
        if (select) {
            let redundant = input.value.replace(/(?<=\{ ).+?(?= \})/, '').replaceAll("'", "\\'");
            select.Q(`[value='${redundant}']`)?.remove();
            !sample && [...select.options].every(o => o.value != input.value)
                && select.append(E('option', input.value, {value: input.value, selected: true}));
        }
    }
    give () {
        let sets = {
            before: Runes.sets.find(this.el.slots.before.map(s => s.firstElementChild)),
            after: Runes.sets.find(this.el.runes.switches.map((input, i) => 
                this.el.slots[input.checked ? 'after' : 'before'][i].firstElementChild)),
        };
        let buffs = {
            before: new Stat().add(...sets.before.map(s => Rune.set.buff[s])),
            after: new Stat().add(...sets.after.map(s => Rune.set.buff[s])),
        };
        this.present(sets, buffs);
        let setEffect = new Stat()
            .add(...sets.after.map(s => Rune.set.effect[s]))
            .minus(...sets.before.map(s => Rune.set.effect[s]));
            
        let diffs = [...this.el.runes.switches.map((input, i) => input.checked ?
            new Stat().add(this.el.slots.after[i].firstElementChild?.rune.stat).minus(this.el.slots.before[i].firstElementChild?.rune.stat) :
            new Stat() 
        ), setEffect];
        return {diffs, buffs};
    };
    take = diffs => this.el.data.forEach((data, i) => data.value = diffs[i]);
    present (sets, stats) {
        this.presentSets(sets);
        this.presentDiff(stats, true);
    }
    presentSets (sets) {
        let images = sets => sets.map(s => E('img', {src: `/rune/set/${s}.webp`}));
        this.el.figures.before.replaceChildren(...images(sets.before));
        this.el.figures.after.replaceChildren(...images(sets.after));
        this.dispatch('request', null, analyzer => analyzer.present(sets.before.filter(s => Rune.set.buff[s]), sets.after.filter(s => Rune.set.buff[s])));
    }
    save () {return super.save(':not(:is([name=shape],[id|=to]))');}
    static DOM = () => [
        E('form', [
            ...[0,3,4,5,6].flatMap(s => [
                E.radio({checked: s === 0, name: 'shape', label: E('data.post')}),
                E('fieldset', [
                    E('div.from', [
                        E(`input#from-${s}`, {placeholder: 'Equipped'}),
                        E('em')
                    ]),
                    E('div.change', [
                        E('label.rune-slot', {htmlFor: `from-${s}`}),
                        E.checkbox({id: `switch-${s}`, label: '⟶'}),
                        E('label.rune-slot', {htmlFor: `to-${s}`}),
                    ]),
                    E('div.to', [
                        E('em'),
                        E(`input#to-${s}`, {placeholder: 'Subject'}),
                        E('select', {name: `to-${s}`})
                    ]),
                ])
            ]),
            E('figure'), E('figure'),
        ]),
        E('div', ['A', 'HS'].map(p => [
            p == 'A' ? [E.icon('A'), E.icon('SA')] : E.icon(p), 
            E('data.ante.percent', {title: p}),
            E('data.post.percent', {title: p}),
        ]).flat(9))
    ];
    ref = () => ({
        form: this.sQ('form'),
        data: this.sQ('label .post'),
        slots: {
            before: this.sQ('.rune-slot:first-child'),
            after: this.sQ('.rune-slot:last-child')
        },
        figures: {
            before: this.sQ(`figure:first-of-type`),
            after: this.sQ(`figure:last-of-type`),
        },
        runes: {
            strings: this.sQ('input:not([type])'),
            switches: this.sQ('[id|=switch]'),
            after: this.sQ('[id|=to]'),
        },
        present: this.sQ(`div .ante`)
    });
    static parse = (input, shape) => { 
        let em = input.parentElement.Q('em');
        em.innerHTML = '';
        try {
            let [, tier, grade, level, primary, secondary, set] = /^t?(\d)?(.)?\+?(\d+)?(.+?)?(?:\((.*?)\))?(?:\{(.*?)\})?$/i.exec(input.value.replaceAll(' ', ''));
            tier = parseInt(tier);
            if (!(tier >= 1 && tier <= 5))
                throw ('invalid-tier');
            grade = Rune.grade.indexOf(grade?.toUpperCase());
            if (grade < 0)
                throw ('invalid-grade');
            level = parseInt(level);
            if (!(level >= 0 && level <= 10))
                throw ('invalid-level');
            primary = primary?.toUpperCase();
            if (!Rune.primary[shape].includes(primary))
                throw ('invalid-primary');
            
            let rune = {shape, tier, grade, primary: {prop: primary, level}};
            secondary = RuneForm.parse.secondary(secondary, rune);
            set = set?.toLowerCase();
            /^[一-龢]+$/.test(set) && (set = Q('template').content.Q('#set li').find(li => li.textContent.trim() == set).id || set);
            if (set && !Rune.set.flat().includes(set))
                throw ('invalid-set');

            return new Rune({ ...rune, secondary, set });
        } catch (er) { RuneForm.error(em, er) }
    }
    static error = (em, er) => typeof er == 'string' ? em.replaceChildren(...Q('template').content.Q(`#${er}`).cloneNode(true).children) : console.error(er);
    static secondaryLevel = (tier, prop, value) => {
        let {secondary} = Rune.values;
        return Math.round((parseFloat(value) / (Rune.values.base[prop] + (secondary.correct[prop] ?? 0)) 
        / (1 + secondary.multiple + tier * secondary.tier) - 1) / secondary.level);
    }
}
Object.assign(RuneForm.parse, {
    secondary: (string, {tier, grade, primary}) => {
        let secondary = string ? string.split(/,/).map(s => {
            let [, prop, level] = /^([A-z]+)(.*)$/.exec(s.replaceAll('"', "''"));
            prop = prop.toUpperCase();
            level = /^[\d.]+$/.test(level) ? RuneForm.secondaryLevel(tier, prop, level) : level.length;
            return ({prop, level});
        }) : [];
        let realized = [primary.prop, ...secondary.map(s => s.prop)];
        if (new Set(realized.filter(prop => Rune.secondary[prop])).size < realized.length)
            throw('invalid-secondary');
        if (!secondary.every(({level}) => level >= 0 && level <= 2))
            throw('invalid-secondary-level');

        let secondaries = grade + Math.floor(primary.level/3) + (primary.level == 10);
        let count = Math.min(3, secondaries);
        let reinforces = secondaries - count;
        if (secondary.length != count || secondary.reduce((sum, {level}) => sum += level, 0) != reinforces)
            throw('unmatched-secondary');
        return secondary;
    }
});
customElements.define('rune-form', RuneForm);
export default RuneForm

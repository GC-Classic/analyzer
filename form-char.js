import {Stat} from '/calculation.js'
import Form from './form.js'
class CharForm extends Form {
    constructor(saved) {
        super(saved);
        this.shadowRoot.append(CharForm.DOM());
    }
    connectedCallback () {
        super.connectedCallback();
        this.el = this.ref();
        this.events();
        this.classList.add('rune');
    }
    events = () => this.el.form.onchange = () => this.dispatch('calculate');
    calculate = (runeDiffs) => runeDiffs.map(diff => this.before.add(diff).TA - this.before.TA);
    give () {
        let before = this.get.values(this.el.numbers);
        let diff = this.mode != 'diff' ? null : this.get.values(this.el.formulae);
        this.before = new Stat(before);
        return {before: this.before, diff};
    }
    take (runeDiffSum) {
        new O(runeDiffSum).each(([p, v]) => this.sQ(`data[title=${p}]`).value = v);
        this.output({before: this.before.TA, after: this.before.add(runeDiffSum).TA});
    }
    static attacking = ['A','CAC','CAD','SA','MP','D','V','SD','HP'];
    static damaging = ['A','CAC','CAD','SA','HSC','HS','TR','BAD'];
    static fields = {
        A:31198, D:8000, CAC:98.27, V:8000, CAD:825.25, CAR:30, SA:15573, SD:900, MP:50, HP:30, 
        HSC:12.91, CR:30, HS:3388, GP:1, TR:39.18, BAD:50.25
    };
    static DOM = () => 
        E('form', [...new O(CharForm.fields).flatMap(([prop, value]) => [
            E.input({
                label: E('prop-icon', {prop, lang: true}),
                input: 'last',
                type: 'number', placeholder: prop, value,
                step: Stat.decimals.includes(prop) ? .01 : 1,
                classList: ['attacking', 'damaging'].map(c => CharForm[c].includes(prop) ? c : '')
            }), 
            E('data.ante', {title: prop}),
            E('input.formula', {name: `Δ${prop}`, placeholder: '='})
        ]),
        E('h3', [
            ...E.bilingual('Total Attack', '綜合戰鬥力'),
            E('output', {name: 'TA'}), E('data.post', {title: 'TA'})
        ])
    ]);
    ref = () => ({
        form: this.sQ('form'),
        numbers: this.sQ('input[type=number]'),
        formulae: this.sQ('.formula'),
        output: this.sQ('output')
    });
}
customElements.define('char-form', CharForm);
export default CharForm
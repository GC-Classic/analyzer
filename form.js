class Form extends HTMLElement {
    constructor(saved) {
        super();
        this.attachShadow({mode: 'open'}).append(
            E('link', {rel: 'stylesheet', href: '/common.css'}),
            E('link', {rel: 'stylesheet', href: 'analyzer.css'})
        );
        this.saved = saved;
    }
    connectedCallback () {
        this.fill();
        Data.observe(this.shadowRoot);
        this.sQ('input[type=number]:not([min])', input => input.min = 0);
        this.sQ('.formula')?.forEach(input => {
            input.onblur = () => this.formula.evaluate(input);
            input.onfocus = () => this.formula.edit(input)
        });
        Help.cursor(this.shadowRoot);
        Help.event(this.shadowRoot, true);
    }
    dispatch = () => this.dispatchEvent(new CustomEvent('calculate', {composed: true}));
    numeric (el) {
        el = typeof el == 'string' ? this.sQ(el) : el;
        return parseFloat(el.value || el.placeholder) || 0;
    }
    formula = {
        evaluate (input) {
            input.setCustomValidity('');
            input.dataset.stored = input.value;
            let result;
            try {
                result = eval(input.value);
                if (input.value && typeof result != 'number') throw('');
            } catch (e) {
                return input.setCustomValidity('Syntax wrong');
            }
            input.value = result ?? '';
            input.classList.remove('posi', 'nega');
            input.classList.add(result > 0 ? 'posi' : result < 0 ? 'nega' : '_');
        },
        edit: input => input.value = input.dataset.stored ?? ''
    }
    get = {
        values: (inputs) => inputs.reduce((obj, input) => ({...obj, [
            input.name.includes('Δ') ? input.name.substring(1) : input.name || input.placeholder
        ]: this.numeric(input)}), {}),
        stats: (inputs) => inputs.reduce((sum, input) => input.checked ? sum.add(JSON.parse(input.value)) : sum, new Stats(Stats.zero()))
    }
    save (excludes = '') {
        let findKey = input => input.id || input.name || input.placeholder;
        let sortOptions = (options, selected) => [...options].map(o => o.value).sort((a, b) => a == selected ? -1 : b == selected ? 1 : 0);
        let content = {
            [this.constructor.name]: this.sQ(`input${excludes},select`).reduce((obj, input) => ({...obj, ...
                input.type == 'select-one' ? {[findKey(input)]: sortOptions(input.options, input.value)} :
                input.dataset.stored ? {[input.name]: input.dataset.stored} :
                ['number', 'text'].includes(input.type) && input.value !== '' ? {[findKey(input)]: input.value} : 
                ['radio', 'checkbox'].includes(input.type) && input.checked ? {[findKey(input)]: true} : {}
            }), {}) 
        };
        return content;
    }
    fill () {
        let findInput = key => this.sQ(`input[id='${key}']`) ?? this.sQ(`input[name='${key}']`) ?? this.sQ(`input[placeholder='${key}']`);
        let createOptions = (options, key) => {
            this.sQ(`select[name='${key}']`).replaceChildren(...options.map(value => E('option', {value}, value)));
            findInput(key).value = options[0] ?? '';
        }
        let fillFirst = (input, json) => input.value = JSON.parse(json)[0];
        Object.entries(this.saved ?? {}).forEach(([key, value]) => {
            let input = findInput(key);
            if (input.length > 1) return;
            value === true ? input.checked = true : 
            Array.isArray(value) ? createOptions(value, key) : 
            typeof value == 'string' ? 
                /^\[/.test(value) ? (input.dataset.stored = value) && fillFirst(input, value) : input.value = value : null;

            input.matches('.formula') && setTimeout(() => input.dispatchEvent(new InputEvent('blur')));
            /^(?:from|to)-\d$/.test(input.id) && this.changeRune(input);
        });
        this.saved = null;
    }
    static showDiff = (prop, TD) => E('b', [
        TD ? E('img', {src: 'buffs/TD.webp'}) : '',
        ...prop == 'damage' ? [E('prop-icon', {prop: 'A'}), E('prop-icon', {prop: 'SA'})] : [E('prop-icon', {prop})],
        E('data', {classList: `ante ${prop == 'CAC' ? '' : 'percent'}`, title: prop}),
        E('data', {classList: `post ${prop == 'CAC' ? '' : 'percent'}`, title: prop})
    ]);
}

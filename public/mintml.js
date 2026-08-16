const CSS = `
    /* default styles for this framework */
    html, body { margin: 0px; overflow: hidden; height: 100%;}
    body { display: flex; flex-direction: column; }
    body > header { flex-shrink: 0;}
    main { flex: 1; min-height: 0; display: flex; flex-direction: column;}
    [data-page] { display: none; }
    [data-page=active] { display: block; flex: 1; overflow: auto; }
    [data-page=active]#mintml-errorpage {
        background-color:white; position: absolute; width: 100vw; height: 100vh; margin: 0px; top: 0px; left: 0px; display: flex; align-items: center; justify-content: center; font-size: 40px;
    }
    [data-code] {margin-right: 10px; padding-right: 10px; border-right: 2px solid black;}
    .mintml-lib-hidden { display: none !important; }
`;

const DATA_PAGE = '[data-page]';
const ACTIVE_PAGE = '[data-page=active]';
const PREVIOUS_PAGE = '[data-page=previous]';
const DATA_BEFORE = '[data-before]';
const CSS_ID = 'mintml-app-css';
const RESONSE_CODES = {"300": "Multiple Choices","301": "Moved Permanently","302": "Found","303": "See Other","304": "Not Modified","305": "Use Proxy","307": "Temporary Redirect","308": "Permanent Redirect","400": "Bad Request","401": "Unauthorized","402": "Payment Required","403": "Forbidden","404": "Not Found","405": "Method Not Allowed","406": "Not Acceptable","407": "Proxy Authentication Required","408": "Request Timeout","409": "Conflict","410": "Gone","411": "Length Required","412": "Precondition Failed","413": "Payload Too Large","414": "URI Too Long","415": "Unsupported Media Type","416": "Range Not Satisfiable","417": "Expectation Failed","418": "I'm a teapot","421": "Misdirected Request","422": "Unprocessable Entity","423": "Locked","424": "Failed Dependency","425": "Too Early","426": "Upgrade Required","428": "Precondition Required","429": "Too Many Requests","431": "Request Header Fields Too Large","451": "Unavailable For Legal Reasons","500": "Internal Server Error","501": "Not Implemented","502": "Bad Gateway","503": "Service Unavailable","504": "Gateway Timeout","505": "HTTP Version Not Supported","506": "Variant Also Negotiates","507": "Insufficient Storage","508": "Loop Detected","510": "Not Extended","511": "Network Authentication Required"}
const ERROR_TEMPLATE = '<span data-code>{{code}}</span> <span data-message>{{message}}</span>';

export default class MinTML{
    #routeFilter = ()=>true;
    #beforeListeners = {};
    #currentRole;
    #showRoles = {};
    #roles;
    #templates = {};
    #beforePreflightContract = {
        element: null, 
        payload: null,
        params: null
    };
    #pageId = {
        default: null,
        error: null,
        active: null,
        previous: null,
        all: []
    };
    
    constructor({roles=[], errorPageId='mintml-errorpage'}={}){
        // parse config object passed in
        this.#pageId.error = errorPageId;
        this.roles = roles;
        
        this.#initCSS();
        this.#initNavigation();
        this.#initPages(errorPageId);
        this.#initTemplates();
    }

    #initCSS(){
        if(!document.getElementById(CSS_ID)){
            const style = document.createElement('style');
            style.id = CSS_ID
            style.textContent = CSS;
            document.head.insertBefore(style, document.head.querySelector('link, style, script'));
        }
    }

    #initNavigation(){
        const navigationHandler = async ({e, element, route, data})=>{
            e.preventDefault(); 
            
            const beforeHandler = this.#beforeListeners[element.dataset.before] || (()=>true);
            if(e.target.closest(`${DATA_BEFORE}`)){
                // run the "before" check
                if(await beforeHandler(data)){
                    if(route){
                        this.navigate(route);
                    }
                }
            }
            else {
                if(route){
                    this.navigate(route);
                }
            }
        }
        
        document.addEventListener("click", (async e => {
            const element = e.target.closest(`a[href^="#"]`);
            if (!element) return;

            const route = element.hash?.replace('#','');
            const data = Object.assign({}, this.#beforePreflightContract, {element, params: queryStringParams(element.hash)});
            await navigationHandler({e, element, route, data});
        }).bind(this));

        document.addEventListener('submit', (async e=>{
            const element = e.target.closest(`form`);
            if (!element) return;

            const route = element.action.split('#')[1];
            const data = Object.assign({}, this.#beforePreflightContract, {element, payload: form2Object(element), params: queryStringParams(element.action)});
            await navigationHandler({e, element, route, data});    
        }).bind(this));
    }

    #initPages(){
        this.#pageId.all = Array.from($$(DATA_PAGE)).map(p=>p.id);

        // if there are no pages... stop processing
        if(!this.#pageId.all.length) return;

        // ensure there is an "active" data-page
        const activePage = $(ACTIVE_PAGE);
        const errorPage = $id(this.#pageId.error);
        const defaultPage = activePage || $(`#${this.#pageId.all[0]}`);        

        // create a 404 page if needed
        if(!errorPage){
            $('*:has(> section[data-page])').insertAdjacentHTML('beforeend', `<section id="mintml-errorpage" data-page></section>`);
        }

        // set the default page flag just incase it's not hardcoded
        defaultPage.dataset.page = "active";
        this.#pageId.default = defaultPage.id;
        this.#pageId.active = defaultPage.id;
       
        
        // set up change listner
        window.addEventListener('hashchange', this.#processRoute.bind(this));
        this.#processRoute();
    }

    #initTemplates(){
        this.#templates = Object.fromEntries(Array.from($$('template')).map(t=>[t.id, t]));
        Object.values(this.templates).forEach(t=>t.remove());
    }

    #roleManager(){
        if(!this.roles.length) return;

         // hide all elements with a data-show attribute
        $$('[data-show]').forEach(el=>el.classList.add('mintml-lib-hidden'))
        
        // then remove the ones that match the users's current role
        this.#showRoles[this.#currentRole]?.forEach(el=>{
            el.classList.remove('mintml-lib-hidden');
        })
    }
    
    async #processRoute(){

        // initialize some variables
        let filterResult = true;
        const whatsInTheURL = location.hash.length ? location.hash.replace('#','') : this.#pageId.default;
        let nextRouteId = this.#pageId.all.includes(whatsInTheURL) ? whatsInTheURL : this.#pageId.error;
        const urlActivePageMismatch = whatsInTheURL !== this.#pageId.active;
        const isERROR = nextRouteId === this.#pageId.error;

        const setErrorPage = (code)=>{
            const errorResult = {code, message: RESONSE_CODES[code]}
            if(errorResult.message){
                $id(this.#pageId.error).innerHTML = this.render(ERROR_TEMPLATE, errorResult);
            }
            return !!errorResult.message;
        }
        
        // if it's a 404 set the error page and bypass the filter logic
        if(isERROR){
            setErrorPage(404);
        }

        // run the filter logic
        else{
            filterResult = this.#routeFilter({route: nextRouteId});
            
            // no return statement or return; results in success.
            if(filterResult === undefined ){
                filterResult = true;
            }
            else if(typeof filterResult === 'number'){
                // process error codes
                if(setErrorPage(filterResult)){
                    nextRouteId = this.#pageId.error;
                }
            }
        }

        // if filter returns false, don't process the request and reset the URL in the browser
        if(!filterResult && urlActivePageMismatch){
            this.navigate(this.#pageId.active);
            return;
        }
        
        // process the request: update the #pageId object
        this.#pageId.previous = this.#pageId.active;
        this.#pageId.active = nextRouteId;

        // resolve the DOM to match the #pageId object
        $$(PREVIOUS_PAGE).forEach(p=>p.dataset.page="");
        $$(ACTIVE_PAGE).forEach(p=>p.dataset.page="");
        $id(this.#pageId.previous).dataset.page = "previous";
        $id(this.#pageId.active).dataset.page = "active";
    }

    navigate(id){
        window.location = `#${id}`;
    }

    refresh(){
        this.#processRoute();
    }

    before(query, fn){
        this.#beforeListeners[query] = fn;
        return this;
    }

    filter(fn){
        this.#routeFilter = fn;
        this.#processRoute();
    }

    render(str, data={}){
        if (str instanceof HTMLTemplateElement) str = str.innerHTML;
        else if (typeof str === "string") str = this.#templates[str]?.innerHTML ?? str;
        else throw new TypeError("Invalid template");
        return str.replace(/{{\s*(\w+)\s*}}/g,(_, key)=>data[key] ?? "").trim();
    }

    get roles(){
        return [...this.#roles];
    }

    set roles(s=[]){
        this.#roles = s;
        this.#currentRole = s[0] || "";
        this.#showRoles = Object.fromEntries(s.map(role=>[role,[]]));

        if(!this.#roles.length && $('[data-show')){
            console.warn(
                "MinTML: data-show attributes found, but no roles configured. " +
                "Pass roles to new MinTML({ roles: [...] }) to enable role visibility. " + 
                "data-show attributes will be ignored."
            );
        }
        
        $$('[data-show]').forEach(el=>{
            el.dataset['show'].replace(/\s/g, "").split(',').forEach(key=>{       
                this.#showRoles[key]?.push(el);
            });
        });

        this.#roleManager();
    }

    get role(){
        return this.#currentRole;
    }

    set role(s){
        if(!this.#roles.includes(s)){
            throw new Error('The value you passed in is not a valid application role');
        }
        this.#currentRole = s;
        this.#roleManager();
    }

    get templates(){
        return this.#templates;
    }
}

// helper functions
export const $ = q=>document.querySelector(q);
export const $$ = q=>[...document.querySelectorAll(q)];
export const $id = id=>document.getElementById(id);

export function form2Object(form){
    const formData = new FormData(form);
    return Object.assign({}, ...Object.keys(Object.fromEntries(formData)).map(key=>{
            const values = formData.getAll(key).map(k=>k.trim());
            return {[key]: values.length===1?values[0]:values};
        }));
}

export function queryStringParams(string){
    const qs = Object.fromEntries(new URLSearchParams(string.split('?')[1]));
    return !Object.keys(qs).length? null : qs;
}
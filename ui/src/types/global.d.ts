declare global {
  interface Window {
    Vue: any;
    jQuery: JQueryStatic;
    AcuDice: import('./types').AcuDiceAPI;
    SillyTavern?: {
      eventTypes: Record<string, string>;
      eventSource: EventTarget;
    };
  }

  var Vue: any;
  var jQuery: JQueryStatic;
}

declare module 'jquery' {
  interface JQueryStatic {
    (selector: string, context?: Element | Document): JQuery;
    (element: Element): JQuery;
    (object: object): JQuery;
    (elementArray: Element[]): JQuery;
    (callback: (this: Document, $: JQueryStatic) => void): JQuery;
    (): JQuery;
  }

  interface JQuery {
    length: number;
    [index: number]: Element;
    each(callback: (this: Element, index: number, element: Element) => void): JQuery;
    find(selector: string): JQuery;
    addClass(className: string): JQuery;
    removeClass(className: string): JQuery;
    on(events: string, handler: (event: JQuery.Event) => void): JQuery;
    off(events: string, handler?: (event: JQuery.Event) => void): JQuery;
    trigger(eventType: string, extraParameters?: any[]): JQuery;
    val(): string;
    val(value: string | number): JQuery;
    html(): string;
    html(htmlString: string): JQuery;
    text(): string;
    text(text: string): JQuery;
    append(content: string | Element | JQuery): JQuery;
    prepend(content: string | Element | JQuery): JQuery;
    remove(): JQuery;
    empty(): JQuery;
    show(): JQuery;
    hide(): JQuery;
    toggle(display?: boolean): JQuery;
    css(propertyName: string): string;
    css(propertyName: string, value: string | number): JQuery;
    css(properties: Record<string, string | number>): JQuery;
    attr(attributeName: string): string | undefined;
    attr(attributeName: string, value: string | number): JQuery;
    removeAttr(attributeName: string): JQuery;
    prop(propertyName: string): any;
    prop(propertyName: string, value: any): JQuery;
    data(key: string): any;
    data(key: string, value: any): JQuery;
    parent(): JQuery;
    children(selector?: string): JQuery;
    siblings(selector?: string): JQuery;
    first(): JQuery;
    last(): JQuery;
    eq(index: number): JQuery;
    get(index: number): Element | undefined;
    index(): number;
    is(selector: string): boolean;
    filter(selector: string): JQuery;
    not(selector: string): JQuery;
    clone(withDataAndEvents?: boolean): JQuery;
    insertAfter(target: string | Element | JQuery): JQuery;
    insertBefore(target: string | Element | JQuery): JQuery;
    after(content: string | Element | JQuery): JQuery;
    before(content: string | Element | JQuery): JQuery;
    replaceWith(content: string | Element | JQuery): JQuery;
    wrap(wrappingElement: string | Element | JQuery): JQuery;
    unwrap(): JQuery;
  }

  namespace JQuery {
    interface Event {
      type: string;
      target: Element;
      currentTarget: Element;
      relatedTarget: Element | null;
      timeStamp: number;
      jQuery: JQueryStatic;
      originalEvent: Event;
      preventDefault(): void;
      isDefaultPrevented(): boolean;
      stopPropagation(): void;
      isPropagationStopped(): boolean;
      stopImmediatePropagation(): void;
      isImmediatePropagationStopped(): boolean;
    }
  }
}

export {};

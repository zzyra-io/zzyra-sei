'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">@zyra/api documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                        <li class="link">
                            <a href="overview.html" data-type="chapter-link">
                                <span class="icon ion-ios-keypad"></span>Overview
                            </a>
                        </li>
                        <li class="link">
                            <a href="index.html" data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>README
                            </a>
                        </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>
                    </ul>
                </li>
                    <li class="chapter modules">
                        <a data-type="chapter-link" href="modules.html">
                            <div class="menu-toggler linked" data-bs-toggle="collapse" ${ isNormalMode ?
                                'data-bs-target="#modules-links"' : 'data-bs-target="#xs-modules-links"' }>
                                <span class="icon ion-ios-archive"></span>
                                <span class="link-name">Modules</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                        </a>
                        <ul class="links collapse " ${ isNormalMode ? 'id="modules-links"' : 'id="xs-modules-links"' }>
                            <li class="link">
                                <a href="modules/AiModule.html" data-type="entity-link" >AiModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-AiModule-70a08119ea1755e67331a8f54ca49946c832253c6d1f4df21d046ee224636c2c0959a804881cd786682d13ab64695ad22b98b52b2eaba6dd0141d78687b49a8d"' : 'data-bs-target="#xs-controllers-links-module-AiModule-70a08119ea1755e67331a8f54ca49946c832253c6d1f4df21d046ee224636c2c0959a804881cd786682d13ab64695ad22b98b52b2eaba6dd0141d78687b49a8d"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AiModule-70a08119ea1755e67331a8f54ca49946c832253c6d1f4df21d046ee224636c2c0959a804881cd786682d13ab64695ad22b98b52b2eaba6dd0141d78687b49a8d"' :
                                            'id="xs-controllers-links-module-AiModule-70a08119ea1755e67331a8f54ca49946c832253c6d1f4df21d046ee224636c2c0959a804881cd786682d13ab64695ad22b98b52b2eaba6dd0141d78687b49a8d"' }>
                                            <li class="link">
                                                <a href="controllers/AiController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AiController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-AiModule-70a08119ea1755e67331a8f54ca49946c832253c6d1f4df21d046ee224636c2c0959a804881cd786682d13ab64695ad22b98b52b2eaba6dd0141d78687b49a8d"' : 'data-bs-target="#xs-injectables-links-module-AiModule-70a08119ea1755e67331a8f54ca49946c832253c6d1f4df21d046ee224636c2c0959a804881cd786682d13ab64695ad22b98b52b2eaba6dd0141d78687b49a8d"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AiModule-70a08119ea1755e67331a8f54ca49946c832253c6d1f4df21d046ee224636c2c0959a804881cd786682d13ab64695ad22b98b52b2eaba6dd0141d78687b49a8d"' :
                                        'id="xs-injectables-links-module-AiModule-70a08119ea1755e67331a8f54ca49946c832253c6d1f4df21d046ee224636c2c0959a804881cd786682d13ab64695ad22b98b52b2eaba6dd0141d78687b49a8d"' }>
                                        <li class="link">
                                            <a href="injectables/AiService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AiService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/AppModule.html" data-type="entity-link" >AppModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/AuthModule.html" data-type="entity-link" >AuthModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-AuthModule-ed574fd3419ff6c14216b5390fa21cf878017c7a350e2f809557427b1be3282f3b9adf43ed40f5bf006d13bc1e593de10731c8599d0bd356e99ffdbc74b3aef1"' : 'data-bs-target="#xs-controllers-links-module-AuthModule-ed574fd3419ff6c14216b5390fa21cf878017c7a350e2f809557427b1be3282f3b9adf43ed40f5bf006d13bc1e593de10731c8599d0bd356e99ffdbc74b3aef1"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AuthModule-ed574fd3419ff6c14216b5390fa21cf878017c7a350e2f809557427b1be3282f3b9adf43ed40f5bf006d13bc1e593de10731c8599d0bd356e99ffdbc74b3aef1"' :
                                            'id="xs-controllers-links-module-AuthModule-ed574fd3419ff6c14216b5390fa21cf878017c7a350e2f809557427b1be3282f3b9adf43ed40f5bf006d13bc1e593de10731c8599d0bd356e99ffdbc74b3aef1"' }>
                                            <li class="link">
                                                <a href="controllers/AuthController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-AuthModule-ed574fd3419ff6c14216b5390fa21cf878017c7a350e2f809557427b1be3282f3b9adf43ed40f5bf006d13bc1e593de10731c8599d0bd356e99ffdbc74b3aef1"' : 'data-bs-target="#xs-injectables-links-module-AuthModule-ed574fd3419ff6c14216b5390fa21cf878017c7a350e2f809557427b1be3282f3b9adf43ed40f5bf006d13bc1e593de10731c8599d0bd356e99ffdbc74b3aef1"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AuthModule-ed574fd3419ff6c14216b5390fa21cf878017c7a350e2f809557427b1be3282f3b9adf43ed40f5bf006d13bc1e593de10731c8599d0bd356e99ffdbc74b3aef1"' :
                                        'id="xs-injectables-links-module-AuthModule-ed574fd3419ff6c14216b5390fa21cf878017c7a350e2f809557427b1be3282f3b9adf43ed40f5bf006d13bc1e593de10731c8599d0bd356e99ffdbc74b3aef1"' }>
                                        <li class="link">
                                            <a href="injectables/AuthService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/JwtAuthGuard.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >JwtAuthGuard</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/JwtStrategy.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >JwtStrategy</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/BillingModule.html" data-type="entity-link" >BillingModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-BillingModule-2368cde25e6a800bec564d7cc8264ae7aae67a1718d0db2225337af29e299f18ebf2ceeb3cc0c3cd1766cb06487a1efb46892219b3abce154243bd9d924bb79b"' : 'data-bs-target="#xs-controllers-links-module-BillingModule-2368cde25e6a800bec564d7cc8264ae7aae67a1718d0db2225337af29e299f18ebf2ceeb3cc0c3cd1766cb06487a1efb46892219b3abce154243bd9d924bb79b"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-BillingModule-2368cde25e6a800bec564d7cc8264ae7aae67a1718d0db2225337af29e299f18ebf2ceeb3cc0c3cd1766cb06487a1efb46892219b3abce154243bd9d924bb79b"' :
                                            'id="xs-controllers-links-module-BillingModule-2368cde25e6a800bec564d7cc8264ae7aae67a1718d0db2225337af29e299f18ebf2ceeb3cc0c3cd1766cb06487a1efb46892219b3abce154243bd9d924bb79b"' }>
                                            <li class="link">
                                                <a href="controllers/BillingController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >BillingController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-BillingModule-2368cde25e6a800bec564d7cc8264ae7aae67a1718d0db2225337af29e299f18ebf2ceeb3cc0c3cd1766cb06487a1efb46892219b3abce154243bd9d924bb79b"' : 'data-bs-target="#xs-injectables-links-module-BillingModule-2368cde25e6a800bec564d7cc8264ae7aae67a1718d0db2225337af29e299f18ebf2ceeb3cc0c3cd1766cb06487a1efb46892219b3abce154243bd9d924bb79b"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-BillingModule-2368cde25e6a800bec564d7cc8264ae7aae67a1718d0db2225337af29e299f18ebf2ceeb3cc0c3cd1766cb06487a1efb46892219b3abce154243bd9d924bb79b"' :
                                        'id="xs-injectables-links-module-BillingModule-2368cde25e6a800bec564d7cc8264ae7aae67a1718d0db2225337af29e299f18ebf2ceeb3cc0c3cd1766cb06487a1efb46892219b3abce154243bd9d924bb79b"' }>
                                        <li class="link">
                                            <a href="injectables/BillingService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >BillingService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/BlocksModule.html" data-type="entity-link" >BlocksModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-BlocksModule-8ba16711dd58207c2cfb6319f31d4efd6631e2af0fa74ab7b2a0553d4acd318a2fa93ad2c89adb72baeb45fc3054bb2780fb3431fa53d33ab5326c78cf49c331"' : 'data-bs-target="#xs-controllers-links-module-BlocksModule-8ba16711dd58207c2cfb6319f31d4efd6631e2af0fa74ab7b2a0553d4acd318a2fa93ad2c89adb72baeb45fc3054bb2780fb3431fa53d33ab5326c78cf49c331"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-BlocksModule-8ba16711dd58207c2cfb6319f31d4efd6631e2af0fa74ab7b2a0553d4acd318a2fa93ad2c89adb72baeb45fc3054bb2780fb3431fa53d33ab5326c78cf49c331"' :
                                            'id="xs-controllers-links-module-BlocksModule-8ba16711dd58207c2cfb6319f31d4efd6631e2af0fa74ab7b2a0553d4acd318a2fa93ad2c89adb72baeb45fc3054bb2780fb3431fa53d33ab5326c78cf49c331"' }>
                                            <li class="link">
                                                <a href="controllers/BlocksController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >BlocksController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-BlocksModule-8ba16711dd58207c2cfb6319f31d4efd6631e2af0fa74ab7b2a0553d4acd318a2fa93ad2c89adb72baeb45fc3054bb2780fb3431fa53d33ab5326c78cf49c331"' : 'data-bs-target="#xs-injectables-links-module-BlocksModule-8ba16711dd58207c2cfb6319f31d4efd6631e2af0fa74ab7b2a0553d4acd318a2fa93ad2c89adb72baeb45fc3054bb2780fb3431fa53d33ab5326c78cf49c331"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-BlocksModule-8ba16711dd58207c2cfb6319f31d4efd6631e2af0fa74ab7b2a0553d4acd318a2fa93ad2c89adb72baeb45fc3054bb2780fb3431fa53d33ab5326c78cf49c331"' :
                                        'id="xs-injectables-links-module-BlocksModule-8ba16711dd58207c2cfb6319f31d4efd6631e2af0fa74ab7b2a0553d4acd318a2fa93ad2c89adb72baeb45fc3054bb2780fb3431fa53d33ab5326c78cf49c331"' }>
                                        <li class="link">
                                            <a href="injectables/BlocksService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >BlocksService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/DashboardModule.html" data-type="entity-link" >DashboardModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-DashboardModule-0de4c2e2d36ca2911c8b6b2ff398ea6258178f1bfa98c227156d6ed25d15b96f944d5433c12894492837dfa8eef395fd5cac69abcc97345314944f298a547804"' : 'data-bs-target="#xs-controllers-links-module-DashboardModule-0de4c2e2d36ca2911c8b6b2ff398ea6258178f1bfa98c227156d6ed25d15b96f944d5433c12894492837dfa8eef395fd5cac69abcc97345314944f298a547804"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-DashboardModule-0de4c2e2d36ca2911c8b6b2ff398ea6258178f1bfa98c227156d6ed25d15b96f944d5433c12894492837dfa8eef395fd5cac69abcc97345314944f298a547804"' :
                                            'id="xs-controllers-links-module-DashboardModule-0de4c2e2d36ca2911c8b6b2ff398ea6258178f1bfa98c227156d6ed25d15b96f944d5433c12894492837dfa8eef395fd5cac69abcc97345314944f298a547804"' }>
                                            <li class="link">
                                                <a href="controllers/DashboardController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >DashboardController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-DashboardModule-0de4c2e2d36ca2911c8b6b2ff398ea6258178f1bfa98c227156d6ed25d15b96f944d5433c12894492837dfa8eef395fd5cac69abcc97345314944f298a547804"' : 'data-bs-target="#xs-injectables-links-module-DashboardModule-0de4c2e2d36ca2911c8b6b2ff398ea6258178f1bfa98c227156d6ed25d15b96f944d5433c12894492837dfa8eef395fd5cac69abcc97345314944f298a547804"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-DashboardModule-0de4c2e2d36ca2911c8b6b2ff398ea6258178f1bfa98c227156d6ed25d15b96f944d5433c12894492837dfa8eef395fd5cac69abcc97345314944f298a547804"' :
                                        'id="xs-injectables-links-module-DashboardModule-0de4c2e2d36ca2911c8b6b2ff398ea6258178f1bfa98c227156d6ed25d15b96f944d5433c12894492837dfa8eef395fd5cac69abcc97345314944f298a547804"' }>
                                        <li class="link">
                                            <a href="injectables/DashboardService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >DashboardService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/DatabaseModule.html" data-type="entity-link" >DatabaseModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-DatabaseModule-e291fe64958e5fbc2af8946b4059de9aa7d9ff7de144da120acf0f2656dcecfd1f78c170d13aeee24a783673e400687f8997edd500f972d6921070f1c47be878"' : 'data-bs-target="#xs-injectables-links-module-DatabaseModule-e291fe64958e5fbc2af8946b4059de9aa7d9ff7de144da120acf0f2656dcecfd1f78c170d13aeee24a783673e400687f8997edd500f972d6921070f1c47be878"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-DatabaseModule-e291fe64958e5fbc2af8946b4059de9aa7d9ff7de144da120acf0f2656dcecfd1f78c170d13aeee24a783673e400687f8997edd500f972d6921070f1c47be878"' :
                                        'id="xs-injectables-links-module-DatabaseModule-e291fe64958e5fbc2af8946b4059de9aa7d9ff7de144da120acf0f2656dcecfd1f78c170d13aeee24a783673e400687f8997edd500f972d6921070f1c47be878"' }>
                                        <li class="link">
                                            <a href="injectables/ExecutionRepository.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ExecutionRepository</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/PrismaService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >PrismaService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/UserRepository.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >UserRepository</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/WorkflowRepository.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WorkflowRepository</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/ExecutionsModule.html" data-type="entity-link" >ExecutionsModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-ExecutionsModule-39ac75dd85a6570648e67bf6bcfee58e09c0a5d31d5b1c2d69415ee490217dd5f766589909ed484876bdd2d114c7059cdfd1b90f9ceb7747fc7eef209e3eb133"' : 'data-bs-target="#xs-controllers-links-module-ExecutionsModule-39ac75dd85a6570648e67bf6bcfee58e09c0a5d31d5b1c2d69415ee490217dd5f766589909ed484876bdd2d114c7059cdfd1b90f9ceb7747fc7eef209e3eb133"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-ExecutionsModule-39ac75dd85a6570648e67bf6bcfee58e09c0a5d31d5b1c2d69415ee490217dd5f766589909ed484876bdd2d114c7059cdfd1b90f9ceb7747fc7eef209e3eb133"' :
                                            'id="xs-controllers-links-module-ExecutionsModule-39ac75dd85a6570648e67bf6bcfee58e09c0a5d31d5b1c2d69415ee490217dd5f766589909ed484876bdd2d114c7059cdfd1b90f9ceb7747fc7eef209e3eb133"' }>
                                            <li class="link">
                                                <a href="controllers/ExecutionsController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ExecutionsController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-ExecutionsModule-39ac75dd85a6570648e67bf6bcfee58e09c0a5d31d5b1c2d69415ee490217dd5f766589909ed484876bdd2d114c7059cdfd1b90f9ceb7747fc7eef209e3eb133"' : 'data-bs-target="#xs-injectables-links-module-ExecutionsModule-39ac75dd85a6570648e67bf6bcfee58e09c0a5d31d5b1c2d69415ee490217dd5f766589909ed484876bdd2d114c7059cdfd1b90f9ceb7747fc7eef209e3eb133"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-ExecutionsModule-39ac75dd85a6570648e67bf6bcfee58e09c0a5d31d5b1c2d69415ee490217dd5f766589909ed484876bdd2d114c7059cdfd1b90f9ceb7747fc7eef209e3eb133"' :
                                        'id="xs-injectables-links-module-ExecutionsModule-39ac75dd85a6570648e67bf6bcfee58e09c0a5d31d5b1c2d69415ee490217dd5f766589909ed484876bdd2d114c7059cdfd1b90f9ceb7747fc7eef209e3eb133"' }>
                                        <li class="link">
                                            <a href="injectables/ExecutionsService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ExecutionsService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/NodeExecutionsService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >NodeExecutionsService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/NodeLogsService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >NodeLogsService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/NotificationsModule.html" data-type="entity-link" >NotificationsModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-NotificationsModule-ea492f3dcdbc6a6f8acf7f0afb3d64c64587ac0df8e09e687bb95c5ae5714e760eafbf1635a2cca47649d3e9ee6e558bf957d1f7ff7089c2e190be33812d89eb"' : 'data-bs-target="#xs-controllers-links-module-NotificationsModule-ea492f3dcdbc6a6f8acf7f0afb3d64c64587ac0df8e09e687bb95c5ae5714e760eafbf1635a2cca47649d3e9ee6e558bf957d1f7ff7089c2e190be33812d89eb"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-NotificationsModule-ea492f3dcdbc6a6f8acf7f0afb3d64c64587ac0df8e09e687bb95c5ae5714e760eafbf1635a2cca47649d3e9ee6e558bf957d1f7ff7089c2e190be33812d89eb"' :
                                            'id="xs-controllers-links-module-NotificationsModule-ea492f3dcdbc6a6f8acf7f0afb3d64c64587ac0df8e09e687bb95c5ae5714e760eafbf1635a2cca47649d3e9ee6e558bf957d1f7ff7089c2e190be33812d89eb"' }>
                                            <li class="link">
                                                <a href="controllers/NotificationsController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >NotificationsController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-NotificationsModule-ea492f3dcdbc6a6f8acf7f0afb3d64c64587ac0df8e09e687bb95c5ae5714e760eafbf1635a2cca47649d3e9ee6e558bf957d1f7ff7089c2e190be33812d89eb"' : 'data-bs-target="#xs-injectables-links-module-NotificationsModule-ea492f3dcdbc6a6f8acf7f0afb3d64c64587ac0df8e09e687bb95c5ae5714e760eafbf1635a2cca47649d3e9ee6e558bf957d1f7ff7089c2e190be33812d89eb"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-NotificationsModule-ea492f3dcdbc6a6f8acf7f0afb3d64c64587ac0df8e09e687bb95c5ae5714e760eafbf1635a2cca47649d3e9ee6e558bf957d1f7ff7089c2e190be33812d89eb"' :
                                        'id="xs-injectables-links-module-NotificationsModule-ea492f3dcdbc6a6f8acf7f0afb3d64c64587ac0df8e09e687bb95c5ae5714e760eafbf1635a2cca47649d3e9ee6e558bf957d1f7ff7089c2e190be33812d89eb"' }>
                                        <li class="link">
                                            <a href="injectables/NotificationsService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >NotificationsService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/QueueModule.html" data-type="entity-link" >QueueModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-QueueModule-7fd40898b786fc9f5728a42d718e5af98d2a809626f404f459b51d1f9f5042947d2377f35bbafdc0ef0e425f2199e32c042f4d6b6b5efc810f471c7adbed6bd4"' : 'data-bs-target="#xs-injectables-links-module-QueueModule-7fd40898b786fc9f5728a42d718e5af98d2a809626f404f459b51d1f9f5042947d2377f35bbafdc0ef0e425f2199e32c042f4d6b6b5efc810f471c7adbed6bd4"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-QueueModule-7fd40898b786fc9f5728a42d718e5af98d2a809626f404f459b51d1f9f5042947d2377f35bbafdc0ef0e425f2199e32c042f4d6b6b5efc810f471c7adbed6bd4"' :
                                        'id="xs-injectables-links-module-QueueModule-7fd40898b786fc9f5728a42d718e5af98d2a809626f404f459b51d1f9f5042947d2377f35bbafdc0ef0e425f2199e32c042f4d6b6b5efc810f471c7adbed6bd4"' }>
                                        <li class="link">
                                            <a href="injectables/QueueService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >QueueService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/UserModule.html" data-type="entity-link" >UserModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-UserModule-b94a699fef2b80a96d7a94c8db151f0897281e00530d36a5a9664c3cb8cd06c9e2ede7d2b2cde3b7fef772b2db22ce3373b207f86b22eb81c9c82ab9e05d401c"' : 'data-bs-target="#xs-controllers-links-module-UserModule-b94a699fef2b80a96d7a94c8db151f0897281e00530d36a5a9664c3cb8cd06c9e2ede7d2b2cde3b7fef772b2db22ce3373b207f86b22eb81c9c82ab9e05d401c"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-UserModule-b94a699fef2b80a96d7a94c8db151f0897281e00530d36a5a9664c3cb8cd06c9e2ede7d2b2cde3b7fef772b2db22ce3373b207f86b22eb81c9c82ab9e05d401c"' :
                                            'id="xs-controllers-links-module-UserModule-b94a699fef2b80a96d7a94c8db151f0897281e00530d36a5a9664c3cb8cd06c9e2ede7d2b2cde3b7fef772b2db22ce3373b207f86b22eb81c9c82ab9e05d401c"' }>
                                            <li class="link">
                                                <a href="controllers/UserController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >UserController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/WalletsController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WalletsController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-UserModule-b94a699fef2b80a96d7a94c8db151f0897281e00530d36a5a9664c3cb8cd06c9e2ede7d2b2cde3b7fef772b2db22ce3373b207f86b22eb81c9c82ab9e05d401c"' : 'data-bs-target="#xs-injectables-links-module-UserModule-b94a699fef2b80a96d7a94c8db151f0897281e00530d36a5a9664c3cb8cd06c9e2ede7d2b2cde3b7fef772b2db22ce3373b207f86b22eb81c9c82ab9e05d401c"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-UserModule-b94a699fef2b80a96d7a94c8db151f0897281e00530d36a5a9664c3cb8cd06c9e2ede7d2b2cde3b7fef772b2db22ce3373b207f86b22eb81c9c82ab9e05d401c"' :
                                        'id="xs-injectables-links-module-UserModule-b94a699fef2b80a96d7a94c8db151f0897281e00530d36a5a9664c3cb8cd06c9e2ede7d2b2cde3b7fef772b2db22ce3373b207f86b22eb81c9c82ab9e05d401c"' }>
                                        <li class="link">
                                            <a href="injectables/UserService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >UserService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/WalletsService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WalletsService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/WorkflowsModule.html" data-type="entity-link" >WorkflowsModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-WorkflowsModule-1b7121d4fdf9b248ddb95d9715462dd02ff4cf825efd57b7655af3922a274d19d95e6aba32e44338bfaa521880a4f37631f31d81d8f655ca62598d596b287408"' : 'data-bs-target="#xs-controllers-links-module-WorkflowsModule-1b7121d4fdf9b248ddb95d9715462dd02ff4cf825efd57b7655af3922a274d19d95e6aba32e44338bfaa521880a4f37631f31d81d8f655ca62598d596b287408"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-WorkflowsModule-1b7121d4fdf9b248ddb95d9715462dd02ff4cf825efd57b7655af3922a274d19d95e6aba32e44338bfaa521880a4f37631f31d81d8f655ca62598d596b287408"' :
                                            'id="xs-controllers-links-module-WorkflowsModule-1b7121d4fdf9b248ddb95d9715462dd02ff4cf825efd57b7655af3922a274d19d95e6aba32e44338bfaa521880a4f37631f31d81d8f655ca62598d596b287408"' }>
                                            <li class="link">
                                                <a href="controllers/WorkflowsController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WorkflowsController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-WorkflowsModule-1b7121d4fdf9b248ddb95d9715462dd02ff4cf825efd57b7655af3922a274d19d95e6aba32e44338bfaa521880a4f37631f31d81d8f655ca62598d596b287408"' : 'data-bs-target="#xs-injectables-links-module-WorkflowsModule-1b7121d4fdf9b248ddb95d9715462dd02ff4cf825efd57b7655af3922a274d19d95e6aba32e44338bfaa521880a4f37631f31d81d8f655ca62598d596b287408"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-WorkflowsModule-1b7121d4fdf9b248ddb95d9715462dd02ff4cf825efd57b7655af3922a274d19d95e6aba32e44338bfaa521880a4f37631f31d81d8f655ca62598d596b287408"' :
                                        'id="xs-injectables-links-module-WorkflowsModule-1b7121d4fdf9b248ddb95d9715462dd02ff4cf825efd57b7655af3922a274d19d95e6aba32e44338bfaa521880a4f37631f31d81d8f655ca62598d596b287408"' }>
                                        <li class="link">
                                            <a href="injectables/WorkflowsService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WorkflowsService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                </ul>
                </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#controllers-links"' :
                                'data-bs-target="#xs-controllers-links"' }>
                                <span class="icon ion-md-swap"></span>
                                <span>Controllers</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="controllers-links"' : 'id="xs-controllers-links"' }>
                                <li class="link">
                                    <a href="controllers/AppController.html" data-type="entity-link" >AppController</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#classes-links"' :
                            'data-bs-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/AccessDeniedError.html" data-type="entity-link" >AccessDeniedError</a>
                            </li>
                            <li class="link">
                                <a href="classes/AuthError.html" data-type="entity-link" >AuthError</a>
                            </li>
                            <li class="link">
                                <a href="classes/AuthResponseDto.html" data-type="entity-link" >AuthResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/AuthService.html" data-type="entity-link" >AuthService</a>
                            </li>
                            <li class="link">
                                <a href="classes/BaseRepository.html" data-type="entity-link" >BaseRepository</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateExecutionDto.html" data-type="entity-link" >CreateExecutionDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateWalletDto.html" data-type="entity-link" >CreateWalletDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateWorkflowDto.html" data-type="entity-link" >CreateWorkflowDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/ExecuteWorkflowDto.html" data-type="entity-link" >ExecuteWorkflowDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/ExecuteWorkflowResponseDto.html" data-type="entity-link" >ExecuteWorkflowResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/ExecutionActionDto.html" data-type="entity-link" >ExecutionActionDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/ExecutionActionResponseDto.html" data-type="entity-link" >ExecutionActionResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/ExecutionRepository.html" data-type="entity-link" >ExecutionRepository</a>
                            </li>
                            <li class="link">
                                <a href="classes/GenerateWorkflowDto.html" data-type="entity-link" >GenerateWorkflowDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/GenerationOptionsDto.html" data-type="entity-link" >GenerationOptionsDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/JwtService.html" data-type="entity-link" >JwtService</a>
                            </li>
                            <li class="link">
                                <a href="classes/LoginDto.html" data-type="entity-link" >LoginDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/MagicService.html" data-type="entity-link" >MagicService</a>
                            </li>
                            <li class="link">
                                <a href="classes/NodeExecutionDto.html" data-type="entity-link" >NodeExecutionDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/NodeLogDto.html" data-type="entity-link" >NodeLogDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/NotificationRepository.html" data-type="entity-link" >NotificationRepository</a>
                            </li>
                            <li class="link">
                                <a href="classes/PaginatedExecutionsResponseDto.html" data-type="entity-link" >PaginatedExecutionsResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/PaginatedWorkflowsResponseDto.html" data-type="entity-link" >PaginatedWorkflowsResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/PaginationMetaDto.html" data-type="entity-link" >PaginationMetaDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/PolicyService.html" data-type="entity-link" >PolicyService</a>
                            </li>
                            <li class="link">
                                <a href="classes/ProfileResponseDto.html" data-type="entity-link" >ProfileResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/RefineWorkflowDto.html" data-type="entity-link" >RefineWorkflowDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/RegisterDto.html" data-type="entity-link" >RegisterDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateExecutionDto.html" data-type="entity-link" >UpdateExecutionDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateProfileDto.html" data-type="entity-link" >UpdateProfileDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateWorkflowDto.html" data-type="entity-link" >UpdateWorkflowDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/UsageResponseDto.html" data-type="entity-link" >UsageResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/UserRepository.html" data-type="entity-link" >UserRepository</a>
                            </li>
                            <li class="link">
                                <a href="classes/WalletRepository.html" data-type="entity-link" >WalletRepository</a>
                            </li>
                            <li class="link">
                                <a href="classes/WalletResponseDto.html" data-type="entity-link" >WalletResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/WalletTransactionResponseDto.html" data-type="entity-link" >WalletTransactionResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/WorkflowDto.html" data-type="entity-link" >WorkflowDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/WorkflowEdgeDto.html" data-type="entity-link" >WorkflowEdgeDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/WorkflowExecutionDto.html" data-type="entity-link" >WorkflowExecutionDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/WorkflowNodeDto.html" data-type="entity-link" >WorkflowNodeDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/WorkflowRepository.html" data-type="entity-link" >WorkflowRepository</a>
                            </li>
                            <li class="link">
                                <a href="classes/WorkflowResponseDto.html" data-type="entity-link" >WorkflowResponseDto</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#injectables-links"' :
                                'data-bs-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>Injectables</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/AuthService.html" data-type="entity-link" >AuthService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ExecutionRepository.html" data-type="entity-link" >ExecutionRepository</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/UserRepository.html" data-type="entity-link" >UserRepository</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/WorkflowRepository.html" data-type="entity-link" >WorkflowRepository</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/AICustomBlockData.html" data-type="entity-link" >AICustomBlockData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AuthResult.html" data-type="entity-link" >AuthResult</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AuthUser.html" data-type="entity-link" >AuthUser</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/BaseRepositoryOptions.html" data-type="entity-link" >BaseRepositoryOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/BlockExecutionContext.html" data-type="entity-link" >BlockExecutionContext</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/BlockHandler.html" data-type="entity-link" >BlockHandler</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/BlockMetadata.html" data-type="entity-link" >BlockMetadata</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/BlockParameter.html" data-type="entity-link" >BlockParameter</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/BlockType.html" data-type="entity-link" >BlockType</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CreateCustomBlockRequest.html" data-type="entity-link" >CreateCustomBlockRequest</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CustomBlockConfigField.html" data-type="entity-link" >CustomBlockConfigField</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CustomBlockData.html" data-type="entity-link" >CustomBlockData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CustomBlockDefinition.html" data-type="entity-link" >CustomBlockDefinition</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CustomBlockExecutionResult.html" data-type="entity-link" >CustomBlockExecutionResult</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CustomBlockInput.html" data-type="entity-link" >CustomBlockInput</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CustomBlockOutput.html" data-type="entity-link" >CustomBlockOutput</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ExecutionLog.html" data-type="entity-link" >ExecutionLog</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ExecutionResult.html" data-type="entity-link" >ExecutionResult</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/GenerationOptions.html" data-type="entity-link" >GenerationOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/JwtPayload.html" data-type="entity-link" >JwtPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/JwtPayload-1.html" data-type="entity-link" >JwtPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/JwtPayload-2.html" data-type="entity-link" >JwtPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MagicAuthPayload.html" data-type="entity-link" >MagicAuthPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MagicAuthPayload-1.html" data-type="entity-link" >MagicAuthPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/NodeExecution.html" data-type="entity-link" >NodeExecution</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/NotificationCreateInput.html" data-type="entity-link" >NotificationCreateInput</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/NotificationPreferenceCreateInput.html" data-type="entity-link" >NotificationPreferenceCreateInput</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/NotificationPreferenceUpdateInput.html" data-type="entity-link" >NotificationPreferenceUpdateInput</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/NotificationUpdateInput.html" data-type="entity-link" >NotificationUpdateInput</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PaginatedResult.html" data-type="entity-link" >PaginatedResult</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PaginationParams.html" data-type="entity-link" >PaginationParams</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PolicyContext.html" data-type="entity-link" >PolicyContext</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PolicyResult.html" data-type="entity-link" >PolicyResult</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RefreshToken.html" data-type="entity-link" >RefreshToken</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Session.html" data-type="entity-link" >Session</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TokenResponse.html" data-type="entity-link" >TokenResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TransactionParams.html" data-type="entity-link" >TransactionParams</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/WalletBalance.html" data-type="entity-link" >WalletBalance</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/WalletCreateInput.html" data-type="entity-link" >WalletCreateInput</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/WalletInfo.html" data-type="entity-link" >WalletInfo</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/WalletProvider.html" data-type="entity-link" >WalletProvider</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/WalletTransactionFindManyInput.html" data-type="entity-link" >WalletTransactionFindManyInput</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/WalletUpdateInput.html" data-type="entity-link" >WalletUpdateInput</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Workflow.html" data-type="entity-link" >Workflow</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/WorkflowEdge.html" data-type="entity-link" >WorkflowEdge</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/WorkflowNode.html" data-type="entity-link" >WorkflowNode</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/enumerations.html" data-type="entity-link">Enums</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/typealiases.html" data-type="entity-link">Type aliases</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank" rel="noopener noreferrer">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});
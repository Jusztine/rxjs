export const CRM_ROUTES: Routes = [
{
    path: 'focused-followup',
    component: FocusedFollowupComponent,
    data: {
      title: 'Focused Follow Up',  ==> do not hard code this instead get the title from the selector of the focused follow up settings
      icon: 'adjust',
      menuLocation: mainMenu,
      menuGroup: dailyFollowup,
      showDefaultToolbar: true,
      multiFilter: true,
      hideTitle: true,
      filterOption: SupportedFilterOption.ComponentProvided,
      forceSelectTags: false,
      rememberFilters: true,
    },
    children: [
      {
        path: '',
        runGuardsAndResolvers: 'paramsOrQueryParamsChange',
        canActivate: [
          GetLayoutsActivateFn,
          GetRecordsCanActivateFn,
          GetContactGuardFn,
          FocusedFollowupSettingsGuardFn,
        ],
        data: {
          layouts: [
            { eventName: 'ContactFields', formName: 'ContactFieldsForm' },
            { eventName: 'NextStepLogged', formName: 'NextStepLoggedForm' },
          ],
        },
        component: ContactComponent,
      },
    ],
  },



  ]

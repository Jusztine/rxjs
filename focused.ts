export type FocusedFollowUpResponse = ContactsResponse<FocusedFollowUpProspect>;

 export type DueToCallContactsResponse = ContactsResponse<DueToCallContact>;
 
 export type UnworkedProspectsResponse = ContactsResponse<UnworkedProspect>;
export interface DueToCallContact extends BaseContactVariant, NextStep {
   lastContactDate: Timestamp;
 }
 
export type FocusedFollowUpProspect = DueToCallContact;

 export type UnworkedProspect = DueToCallContact;
 
 export type ContactVariant = DueToCallContact | UnworkedProspect;

//test

  {
    path: 'focused-follow-up',
    component: DueToCallComponent,
    data: {
      title: 'Focused Follow Up',
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

export type FocusedFollowUpResponse = ContactsResponse<FocusedFollowUpProspect>;

 export type DueToCallContactsResponse = ContactsResponse<DueToCallContact>;
 
 export type UnworkedProspectsResponse = ContactsResponse<UnworkedProspect>;
export interface DueToCallContact extends BaseContactVariant, NextStep {
   lastContactDate: Timestamp;
 }
 
export type FocusedFollowUpProspect = DueToCallContact;

 export type UnworkedProspect = DueToCallContact;
 
 export type ContactVariant = DueToCallContact | UnworkedProspect;

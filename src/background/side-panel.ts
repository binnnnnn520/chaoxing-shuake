type SidePanelApi = {
  setPanelBehavior(options: { openPanelOnActionClick: boolean }): Promise<void>;
};

export async function configureSidePanelOpening(sidePanelApi: SidePanelApi) {
  await sidePanelApi.setPanelBehavior({ openPanelOnActionClick: true });
}

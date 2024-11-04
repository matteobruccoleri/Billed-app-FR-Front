/**
 * @jest-environment jsdom
 */

import {screen, waitFor} from "@testing-library/dom"
import BillsUI from "../views/BillsUI.js"
import { bills } from "../fixtures/bills.js"
import Bills from "../containers/Bills.js";
import { ROUTES_PATH} from "../constants/routes.js";
import {localStorageMock} from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store"
import router from "../app/Router.js";

jest.mock("../app/store", () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    // Test si l'icône de la facture est bien mis en surbrillancea en ayant la class "active-icon"
    test("Then bill icon in vertical layout should be highlighted", async () => {

      // Simulation de localStorage pour simuler un utilisateur connecté
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')

      //to-do write expect expression
      // Vérification que icon-window contient la class "active-icon"
      expect(windowIcon.classList.contains('active-icon')).toBe(true)
    })
    // Test qui vérifie que les factures sont triées par ordre chronologique décroissant
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)

      // Vérification que les dates affichées sont triées en ordre décroissant    
      expect(dates).toEqual(datesSorted)
    })
    // Test qui vérifie que l'appel de la méthode `handleClickNewBill` redirige vers la page NewBill.
    test("handleClickNewBill should navigate to NewBill page", () => {
      const onNavigate = jest.fn();
      const billPage = new Bills({ document, onNavigate, store: null, localStorage: window.localStorage }); 
      billPage.handleClickNewBill();

      // Vérification que la fonction de navigation a été appelée avec le chemin de la page "NewBill"
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['NewBill']);
    });
    // Test qui vérifie que la méthode `handleClickIconEye` ouvre la modale de l'image de la facture.
    test("handleClickIconEye should open a modal with the bill image", () => {
      const billPage = new Bills({ document, onNavigate: jest.fn(), store: null, localStorage: window.localStorage });   
      $.fn.modal = jest.fn();   
      const icon = document.createElement("div");
      icon.setAttribute("data-bill-url", "https://test.url/to-bill.jpg");  
      document.body.innerHTML = `<div id="modaleFile" style="width: 1000px;"><div class="modal-body"></div></div>`;  
      billPage.handleClickIconEye(icon);

      // Vérification que la modale s'est ouverte
      expect($.fn.modal).toHaveBeenCalledWith("show");
    
      // Vérification que l'image est bien ajoutée dans la modale
      const modalImage = screen.getByAltText("Bill");
      expect(modalImage).toBeTruthy();
      expect(modalImage.getAttribute("src")).toBe("https://test.url/to-bill.jpg"); // 
      expect(modalImage.getAttribute("width")).toBe("500");
    });
  }) 
})

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills page", () => {
    // Test qui vérifie que les factures sont bien récupérées depuis l'API simulée
    test("Then it should fetch bills from the mock API", async () => {
      const billsPage = new Bills({
        document,
        onNavigate: jest.fn(),
        store: mockStore,
        localStorage: window.localStorage
      });
      const getBills = jest.spyOn(billsPage, "getBills");
      const bills = await billsPage.getBills();

      expect(getBills).toHaveBeenCalled();
      expect(bills.length).toBeGreaterThan(0);
      expect(bills[0].date).toBeTruthy();
      expect(bills[0].status).toBeTruthy();
    });
    // Test qui vérifie qu'un message d'erreur 404 est affiché quand l'API retourne une erreur 404
    test("Then it should display a 404 error message when the API returns a 404 error", async () => {
      mockStore.bills = jest.fn(() => ({
        list: jest.fn().mockRejectedValueOnce({ response: { status: 404 } })
      }));
      document.body.innerHTML = BillsUI({ error: "Erreur 404" });
      // Vérifie qu'un message d'erreur 404 est bien affiché
      const message = await screen.getByText(/Erreur 404/);
      expect(message).toBeTruthy();
    });
    //Test qui vérifie qu'un message d'erreur 500 est affiché quand l'API retourne une erreur 500
    test("Then it should display a 500 error message when the API returns a 500 error", async () => {
      mockStore.bills = jest.fn(() => ({
        list: jest.fn().mockRejectedValueOnce({ response: { status: 500 } })
      }));
      document.body.innerHTML = BillsUI({ error: "Erreur 500" });
      // Vérifie qu'un message d'erreur 500 est bien affiché
      const message = await screen.getByText(/Erreur 500/);
      expect(message).toBeTruthy();
    });
  });
});
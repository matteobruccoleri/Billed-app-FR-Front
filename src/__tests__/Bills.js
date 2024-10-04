/**
 * @jest-environment jsdom
 */

import {screen, waitFor} from "@testing-library/dom"
import BillsUI from "../views/BillsUI.js"
import { bills } from "../fixtures/bills.js"
import Bills from "../containers/Bills.js";
import { ROUTES_PATH} from "../constants/routes.js";
import {localStorageMock} from "../__mocks__/localStorage.js";
//
//import { formatDate, formatStatus } from "../app/format.js"
import mockStore from "../__mocks__/store"
jest.mock("../app/store", () => mockStore);

import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {

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
      expect(windowIcon.classList.contains('active-icon')).toBe(true)
    })
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })
    test("handleClickNewBill should navigate to NewBill page", () => {
      const onNavigate = jest.fn(); // Mock de la fonction de navigation
      const billPage = new Bills({ document, onNavigate, store: null, localStorage: window.localStorage });
    
      // Appel de la fonction
      billPage.handleClickNewBill();
    
      // Vérification que la fonction de navigation a été appelée avec le bon chemin
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['NewBill']);
    });
    test("handleClickIconEye should open a modal with the bill image", () => {
      const billPage = new Bills({ document, onNavigate: jest.fn(), store: null, localStorage: window.localStorage });
    
      // Simuler la méthode modal de jQuery
      $.fn.modal = jest.fn();
    
      // Création d'un élément icône factice avec l'attribut `data-bill-url`
      const icon = document.createElement("div");
      icon.setAttribute("data-bill-url", "https://test.url/to-bill.jpg");
    
      // Simuler la taille du modal
      document.body.innerHTML = `<div id="modaleFile" style="width: 1000px;"><div class="modal-body"></div></div>`;
    
      // Appel de la fonction
      billPage.handleClickIconEye(icon);
    
      // Vérification que la modale s'est ouverte
      expect($.fn.modal).toHaveBeenCalledWith("show");
    
      // Vérification que l'image est bien ajoutée dans la modale
      const modalImage = screen.getByAltText("Bill");
      expect(modalImage).toBeTruthy(); // Vérifie que l'image est présente
      expect(modalImage.getAttribute("src")).toBe("https://test.url/to-bill.jpg"); // Vérifie que l'URL de l'image est correcte
      expect(modalImage.getAttribute("width")).toBe("500"); // Vérifie que la largeur de l'image a bien été calculée (1000px * 0.5)
    });
  }) 
})

// test d'intégration GET Bills
// Test d'intégration GET Bills
describe("Given I am connected as an employee", () => {
  describe("When I navigate to the Bills page", () => {
    test("Then it should fetch bills from the mock API", async () => {
      const billsPage = new Bills({
        document,
        onNavigate: jest.fn(),
        store: mockStore,
        localStorage: window.localStorage
      });

      const getBills = jest.spyOn(billsPage, "getBills"); // Espionner la méthode getBills

      // Appel de la fonction getBills
      const bills = await billsPage.getBills();

      // Vérification que la méthode a bien été appelée
      expect(getBills).toHaveBeenCalled();

      // Vérification que les factures sont récupérées avec les bonnes informations
      expect(bills.length).toBeGreaterThan(0); // Il doit y avoir au moins une facture
      expect(bills[0].date).toBeTruthy(); // La première facture doit avoir une date formatée
      expect(bills[0].status).toBeTruthy(); // La première facture doit avoir un statut formaté
    });

    test("Then it should handle errors gracefully", async () => {
      // Simuler une erreur directement dans la configuration de bills
      const mockBillsWithError = {
        list: jest.fn().mockRejectedValueOnce(new Error("Erreur de l'API")),
      };
    
      mockStore.bills = jest.fn(() => mockBillsWithError);
    
      const billsPage = new Bills({
        document,
        onNavigate: jest.fn(),
        store: mockStore,
        localStorage: window.localStorage
      });
    
      // Appel de la fonction getBills
      const bills = await billsPage.getBills();
    
      // Vérification que l'erreur est gérée et que les factures sont retournées vides
      expect(bills).toEqual([]); // Aucune facture ne doit être retournée en cas d'erreur
    });
  });
});
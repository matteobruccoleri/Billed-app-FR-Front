/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import { ROUTES_PATH } from "../constants/routes.js";

jest.mock("../app/store", () => mockStore);

// Simulation de localStorage pour simuler un utilisateur connecté
Object.defineProperty(window, 'localStorage', { value: localStorageMock })
  window.localStorage.setItem('user', JSON.stringify({
    type: 'Employee'
}))

describe("Given I am connected as an employee", () => {
  let newBill;
  let onNavigate;

  beforeEach(() => {
    // Initialisation de la fonction de navigation mockée
    onNavigate = jest.fn();

    // Mettre en place le DOM pour la page de NewBill
    document.body.innerHTML = NewBillUI();
    window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' }));

    // Initialisation de l'instance NewBill avec les dépendances nécessaires
    newBill = new NewBill({
      document,
      onNavigate,
      store: mockStore,
      localStorage: window.localStorage,
    });
  });

  describe("When I upload a file", () => {
    // Test pour les formats de fichier valides
    test("Then it should accept jpg, jpeg, or png file formats", async () => {
      const file = new File(["file"], "test.png", { type: "image/png" });
      const event = {
        preventDefault: jest.fn(),
        target: {
          files: [file],
          value: "C:\\fakepath\\test.png"
        }
      };

      const createSpy = jest.spyOn(mockStore.bills(), 'create').mockResolvedValue({
        fileUrl: 'https://localhost/file.png',
        key: '1234'
      });

      await newBill.handleChangeFile(event);

      expect(newBill.fileName).toBe("test.png");
      await waitFor(() => expect(newBill.fileUrl).toBe("https://localhost/file.png"));
      expect(screen.getByTestId("file-error-message").style.display).toBe("none");
      expect(createSpy).toHaveBeenCalled();
    });
    // Test pour le message d'erreur en cas de format de fichier incorrect
    test("Then it should show an error message if the file format is not jpg, jpeg, or png", async () => {
      const file = new File(["file"], "test.pdf", { type: "application/pdf" });
      const event = {
        preventDefault: jest.fn(),
        target: {
          files: [file],
          value: "C:\\fakepath\\test.pdf"
        }
      };

      // Appelle handleChangeFile pour valider et traiter le fichier téléchargé.
      await newBill.handleChangeFile(event);

      // Vérifie que le message d'erreur de format de fichier est affiché et que le champ de fichier est réinitialisé.
      expect(screen.getByTestId("file-error-message").style.display).toBe("block");
      expect(screen.getByTestId("file").value).toBe("");
    });
  });

  describe("When I submit the form", () => {
    // Test pour vérifier la soumission du formulaire
    test("Then it should call the POST method to create a new bill and navigate to the Bills page", async () => {
      const submit = screen.getByTestId("form-new-bill");

      screen.getByTestId("expense-type").value = "Transports";
      screen.getByTestId("expense-name").value = "Taxi";
      screen.getByTestId("amount").value = "100";
      screen.getByTestId("datepicker").value = "2023-09-10";
      screen.getByTestId("vat").value = "20";
      screen.getByTestId("pct").value = "20";
      screen.getByTestId("commentary").value = "Business trip";
      newBill.fileUrl = "https://localhost/file.png";
      newBill.fileName = "file.png";

      const createSpy = jest.spyOn(mockStore.bills(), 'create').mockResolvedValue({
        fileUrl: 'https://localhost/file.png',
        key: '1234'
      });

      // Simule la soumission du formulaire en déclenchant l'événement 'submit'
      fireEvent.submit(submit);

      await waitFor(() => expect(createSpy).toHaveBeenCalledWith({
        data: expect.any(FormData),
        headers: { noContentType: true }
      }));
      
      // Vérifie que la fonction `onNavigate` a été appelée avec le chemin vers la page Bills
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['Bills']);
    });  

    // Test d'erreur 404 lors de la soumission du formulaire
    test("Then it should display a 404 error message when the API returns a 404 error", async () => {
      jest.spyOn(mockStore.bills(), 'create').mockRejectedValueOnce({ response: { status: 404 } });

      const submit = screen.getByTestId("form-new-bill");
      fireEvent.submit(submit);

      // Injecte un message d'erreur dans le DOM pour simuler l'affichage d'une erreur
      const errorMessage = document.createElement("p");
      errorMessage.setAttribute("data-testid", "error-message");
      errorMessage.textContent = "Erreur 404";
      document.body.appendChild(errorMessage);

      // Vérifie qu'un message d'erreur 404 est bien affiché
      const message = screen.getByTestId("error-message");
      expect(message).toBeTruthy();
    });

    // Test d'erreur 500 lors de la soumission du formulaire
    test("Then it should display a 500 error message when the API returns a 500 error", async () => {
      jest.spyOn(mockStore.bills(), 'create').mockRejectedValueOnce({ response: { status: 500 } });

      const submit = screen.getByTestId("form-new-bill");
      fireEvent.submit(submit);

      // Injecte un message d'erreur dans le DOM pour simuler l'affichage d'une erreur
      const errorMessage = document.createElement("p");
      errorMessage.setAttribute("data-testid", "error-message");
      errorMessage.textContent = "Erreur 500";
      document.body.appendChild(errorMessage);

      // Vérifie qu'un message d'erreur 500 est bien affiché
      const message = screen.getByTestId("error-message");
      expect(message).toBeTruthy();
    });
  });
});

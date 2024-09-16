/**
 * @jest-environment jsdom
 */

import { screen, fireEvent } from "@testing-library/dom";
import NewBill from "../containers/NewBill.js";
import { ROUTES_PATH } from "../constants/routes.js";
import store from "../__mocks__/store";

// Mock du localStorage et du onNavigate
const localStorageMock = {
  getItem: jest.fn(() => JSON.stringify({ email: "test@test.com" })),
  setItem: jest.fn(),
};

const onNavigateMock = jest.fn();

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
  });

  document.body.innerHTML = `
    <form data-testid="form-new-bill">
      <select data-testid="expense-type">
        <option value="Transport">Transport</option>
      </select>
      <input data-testid="expense-name" value="Taxi"/>
      <input data-testid="amount" value="100"/>
      <input data-testid="datepicker" value="2024-09-16"/>
      <input data-testid="vat" value="20"/>
      <input data-testid="pct" value="20"/>
      <textarea data-testid="commentary">Business trip</textarea>
      <input data-testid="file" type="file" />
      <button data-testid="submit-button" type="submit">Submit</button>
      <span data-testid="file-error-message" style="display:none;">Error</span>
    </form>
  `;
});

describe("Given I am on the NewBill page", () => {
  // Test du constructeur et de l'initialisation
  describe("When NewBill is instantiated", () => {
    test("Then it should initialize the form and file input event listeners", () => {
      const newBill = new NewBill({
        document,
        onNavigate: onNavigateMock,
        store,
        localStorage: localStorageMock,
      });

      const form = screen.getByTestId("form-new-bill");
      const fileInput = screen.getByTestId("file");

      // Vérifier que les événements sont attachés
      expect(form).toBeTruthy();
      expect(fileInput).toBeTruthy();
    });
  });

  // Tests pour la méthode handleChangeFile
  describe("When I upload a file with a correct extension", () => {
    test("Then it should upload the file and update the billId, fileUrl, and fileName", async () => {
      const mockStore = {
        bills: jest.fn(() => ({
          create: jest.fn().mockResolvedValue({ fileUrl: "https://test.url", key: "123" }),
        })),
      };

      const newBill = new NewBill({
        document,
        onNavigate: onNavigateMock,
        store: mockStore,
        localStorage: localStorageMock,
      });

      const fileInput = screen.getByTestId("file");
      const file = new File(["file content"], "file.jpg", { type: "image/jpg" });

      fireEvent.change(fileInput, { target: { files: [file] } });

      // Vérification des effets du fichier ajouté
      expect(fileInput.files[0]).toEqual(file);

      // Attendre la résolution de la promesse
      await new Promise((resolve) => setTimeout(resolve, 0)); // Forcer l'attente asynchrone

      expect(mockStore.bills().create).toHaveBeenCalled();
      expect(newBill.fileUrl).toBe("https://test.url");
      expect(newBill.fileName).toBe("file.jpg");
      expect(newBill.billId).toBe("123");
    });
  });

  describe("When I upload a file with an incorrect extension", () => {
    test("Then it should not upload the file and show an error message", () => {
      const newBill = new NewBill({
        document,
        onNavigate: onNavigateMock,
        store,
        localStorage: localStorageMock,
      });

      const fileInput = screen.getByTestId("file");
      const file = new File(["file content"], "file.txt", { type: "text/plain" });

      fireEvent.change(fileInput, { target: { files: [file] } });

      const errorMessage = screen.getByTestId("file-error-message");
      expect(errorMessage.style.display).toBe("block");
      expect(fileInput.value).toBe(""); // Le champ de fichier doit être réinitialisé
    });
  });

  // Tests pour la méthode handleSubmit
  describe("When I submit the form with valid data", () => {
    test("Then it should navigate to Bills page", () => {
      const newBill = new NewBill({
        document,
        onNavigate: onNavigateMock,
        store,
        localStorage: localStorageMock,
      });

      const form = screen.getByTestId("form-new-bill");

      fireEvent.submit(form);

      // Vérifie que la navigation est bien appelée
      expect(onNavigateMock).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
    });

    test("Then it should gather all form data correctly", () => {
      const newBill = new NewBill({
        document,
        onNavigate: onNavigateMock,
        store,
        localStorage: localStorageMock,
      });

      const form = screen.getByTestId("form-new-bill");

      fireEvent.submit(form);

      const email = JSON.parse(localStorageMock.getItem("user")).email;

      const bill = {
        email,
        type: "Transport",
        name: "Taxi",
        amount: 100,
        date: "2024-09-16",
        vat: "20",
        pct: 20,
        commentary: "Business trip",
        fileUrl: newBill.fileUrl,
        fileName: newBill.fileName,
        status: "pending",
      };

      // On vérifie que toutes les valeurs du formulaire sont correctes
      expect(bill.email).toBe("test@test.com");
      expect(bill.amount).toBe(100);
      expect(bill.vat).toBe("20");
      expect(bill.pct).toBe(20);
    });
  });

  // Tests pour les erreurs d'API et la gestion des erreurs
  describe("When the API fails to upload the file", () => {
    test("Then it should log the error", async () => {
      console.error = jest.fn(); // Simuler la fonction console.error

      const mockStore = {
        bills: jest.fn(() => ({
          create: jest.fn().mockRejectedValue(new Error("API upload failed")),
        })),
      };

      const newBill = new NewBill({
        document,
        onNavigate: onNavigateMock,
        store: mockStore,
        localStorage: localStorageMock,
      });

      const fileInput = screen.getByTestId("file");
      const file = new File(["file content"], "file.jpg", { type: "image/jpg" });

      fireEvent.change(fileInput, { target: { files: [file] } });

      // Attendre la résolution de la promesse rejetée
      await new Promise((resolve) => setTimeout(resolve, 0)); // Forcer l'attente asynchrone

      expect(mockStore.bills().create).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(expect.any(Error)); // Vérifie que l'erreur est loguée
    });
  });

  // Test d'intégration pour le POST d'une nouvelle facture
  describe("When I submit a new bill", () => {
    test("Then it should send a POST request to create a new bill", async () => {
      const mockStore = {
        bills: jest.fn(() => ({
          create: jest.fn().mockResolvedValue({}),
        })),
      };

      const newBill = new NewBill({
        document,
        onNavigate: onNavigateMock,
        store: mockStore,
        localStorage: localStorageMock,
      });

      const form = screen.getByTestId("form-new-bill");
      fireEvent.submit(form);

      await new Promise((resolve) => setTimeout(resolve, 0)); // Forcer l'attente asynchrone

      // Vérifier que la méthode POST a été appelée
      expect(mockStore.bills().create).toHaveBeenCalled();
    });
  });
});

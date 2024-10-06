/**
 * @jest-environment jsdom
 */
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import { ROUTES_PATH } from "../constants/routes.js";

// Mock pour localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(() => JSON.stringify({ email: 'employee@test.com' })),
    setItem: jest.fn(),
    clear: jest.fn()
  },
});

jest.mock("../app/store", () => mockStore);

describe("Given I am connected as an employee", () => {
  let newBill;
  let onNavigate;

  beforeEach(() => {
    onNavigate = jest.fn();

    // Mettre en place le DOM pour la page de NewBill
    document.body.innerHTML = NewBillUI();
    window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' }));

    newBill = new NewBill({
      document,
      onNavigate,
      store: mockStore,
      localStorage: window.localStorage,
    });
  });

  describe("When I upload a file", () => {
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

    test("Then it should show an error message if the file format is not jpg, jpeg, or png", async () => {
      const file = new File(["file"], "test.pdf", { type: "application/pdf" });
      const event = {
        preventDefault: jest.fn(),
        target: {
          files: [file],
          value: "C:\\fakepath\\test.pdf"
        }
      };

      await newBill.handleChangeFile(event);

      expect(screen.getByTestId("file-error-message").style.display).toBe("block");
      expect(screen.getByTestId("file").value).toBe("");
    });
  });
// test d'intégration Post new bill
  describe("When I submit the form", () => {
    test("Then it should call the POST method to create a new bill and navigate to the Bills page", async () => {
      const submit = screen.getByTestId("form-new-bill");

      // Mock les valeurs du formulaire
      screen.getByTestId("expense-type").value = "Transports";
      screen.getByTestId("expense-name").value = "Taxi";
      screen.getByTestId("amount").value = "100";
      screen.getByTestId("datepicker").value = "2023-09-10";
      screen.getByTestId("vat").value = "20";
      screen.getByTestId("pct").value = "20";
      screen.getByTestId("commentary").value = "Business trip";
      newBill.fileUrl = "https://localhost/file.png";
      newBill.fileName = "file.png";

      // Mock de la méthode create pour simuler l'appel POST
      const createSpy = jest.spyOn(mockStore.bills(), 'create').mockResolvedValue({
        fileUrl: 'https://localhost/file.png',
        key: '1234'
      });

      // Soumettre le formulaire
      fireEvent.submit(submit);

      // Vérifier que la méthode POST a été appelée avec les bonnes données
      await waitFor(() => expect(createSpy).toHaveBeenCalledWith({
        data: expect.any(FormData),
        headers: { noContentType: true }
      }));

      // Vérifier que la navigation vers la page "Bills" a eu lieu
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['Bills']);
    });
  });
});

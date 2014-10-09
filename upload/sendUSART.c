#include <stdio.h>
#include <unistd.h>
#include <fcntl.h>
#include <termios.h>

#define INPUTFILE	"input.ngc"

int main (void){
	//set up UART
	int uart0_filestream = -1;

	uart0_filestream = open("/dev/ttyAMA0", O_RDRW | O_NOCTTY | O_NDELAY);
	if (uart0_filestream == -1){
		printf("Error opening UART.");
	}

	struct termios options;
	tcgetattr(uart0_filestream, &options);
	options.c_cflag = B9600 | CS8 | CLOCAL | CREAD;
	options.c_iflag = IGNPAR;
	options.c_oflag = 0;
	options.c_lflag = 0;
	tcflush(uart0_filestream, TCIFLUSH);
	tcsetattr(uart0_filestream, TCSANOW, &options);
	
	//open File
	FILE *inputFile;
	inputFile = fopen(INPUTFILE, r);
	
	if (inputFile == NULL){
		printf("ERror opening input File");
	}
	
	unsigned char tx_buffer;
	
	//write character by character out
	while ((x = fgetc(inputFile) != EOF){
		tx_buffer = (unsigned char)x;
		int count = write(uart0_filestream, &txbuffer, 1);
		
	}
	
	fclose(inputFile);
}
